package art.yesulin.event.application.registration;

import art.yesulin.auth.application.memberlink.MemberLinkCodeService;
import art.yesulin.event.domain.EventErrorCode;
import art.yesulin.event.domain.EventRepository;
import art.yesulin.event.domain.registration.EventRegistration;
import art.yesulin.event.domain.registration.EventRegistrationRepository;
import art.yesulin.event.domain.registration.visit.EventBusinessCardVisit;
import art.yesulin.event.domain.registration.visit.EventBusinessCardVisitRepository;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventBusinessCardService {

    private final EventRegistrationRepository repository;
    private final MemberLinkCodeService memberLinkCodeService;
    private final AdminAuditLogRepository auditLogRepository;
    private final EventBusinessCardVisitRepository visitRepository;
    private final EventRepository eventRepository;
    private final Clock clock;
    private final String baseUrl;

    public EventBusinessCardService(
            EventRegistrationRepository repository, MemberLinkCodeService memberLinkCodeService,
            AdminAuditLogRepository auditLogRepository, EventBusinessCardVisitRepository visitRepository,
            EventRepository eventRepository, Clock clock,
            @Value("${yesulin.notice.link-base-url}") String baseUrl
    ) {
        this.repository = repository;
        this.memberLinkCodeService = memberLinkCodeService;
        this.auditLogRepository = auditLogRepository;
        this.visitRepository = visitRepository;
        this.eventRepository = eventRepository;
        this.clock = clock;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
    }

    public EventBusinessCardResult describe(EventRegistration registration) {
        if (registration.getBusinessCardKey() == null) {
            return null;
        }
        return new EventBusinessCardResult(
                registration.getBusinessCardKey(), baseUrl + "/events/cards/" + registration.getBusinessCardKey(),
                absoluteProfileUrl(registration.getBusinessCardProfileUrl()), registration.getBusinessCardMemberId()
        );
    }

    public void connectApplicantProfile(EventRegistration registration, long memberId, String handle) {
        registration.connectBusinessCard("/actors/@" + handle, memberId);
    }

    /** 공개 응답에는 목적지만 포함하며 신청자나 연결 회원 정보는 노출하지 않는다. */
    @Transactional(readOnly = true)
    public String destination(String publicId) {
        if (!isUuid(publicId)) {
            throw notFound();
        }
        return absoluteProfileUrl(repository.findByBusinessCardKey(publicId)
                .orElseThrow(EventBusinessCardService::notFound).getBusinessCardProfileUrl());
    }

    /** 유효한 명함 접속을 이벤트에만 기록한다. 신청 삭제·연결 변경과 같은 행 잠금을 쓴다. */
    @Transactional
    public String visit(String publicId) {
        if (!isUuid(publicId)) {
            throw notFound();
        }
        EventRegistration registration = repository.findByBusinessCardKeyForUpdate(publicId)
                .orElseThrow(EventBusinessCardService::notFound);
        String destination = absoluteProfileUrl(registration.getBusinessCardProfileUrl());
        visitRepository.save(new EventBusinessCardVisit(registration.getEventId(), clock.instant()));
        return destination;
    }

    @Transactional(readOnly = true)
    public EventBusinessCardVisitStats visitStats(long eventId, int days) {
        if (days < 1 || days > 90) {
            throw new BusinessException(EventErrorCode.INVALID_INPUT, "조회 기간은 1일부터 90일까지 선택해 주세요.");
        }
        if (!eventRepository.existsById(eventId)) {
            throw new BusinessException(EventErrorCode.NOT_FOUND, "이벤트를 찾을 수 없습니다.");
        }
        LocalDate today = LocalDate.now(clock.withZone(ZoneId.of("Asia/Seoul")));
        LocalDate from = today.minusDays(days - 1L);
        Map<LocalDate, EventBusinessCardVisitRepository.Daily> counts = visitRepository.daily(
                eventId, from, today).stream().collect(Collectors.toMap(
                        EventBusinessCardVisitRepository.Daily::getDate, Function.identity()));
        return new EventBusinessCardVisitStats(
                from, today,
                from.datesUntil(today.plusDays(1)).map(date -> {
                    EventBusinessCardVisitRepository.Daily count = counts.get(date);
                    return new EventBusinessCardVisitStats.Daily(date,
                            count == null ? 0 : count.getVisits());
                }).toList()
        );
    }

    @Transactional
    public EventBusinessCardResult updateProfile(long adminId, long eventId, long registrationId, String profileUrl) {
        EventRegistration registration = registrationForUpdate(eventId, registrationId);
        registration.connectBusinessCard(profileUrl, registration.getBusinessCardMemberId());
        audit(adminId, eventId, registrationId);
        return describe(registration);
    }

    @Transactional
    public EventBusinessCardResult connectMember(long adminId, long eventId, long registrationId, String code) {
        EventRegistration registration = registrationForUpdate(eventId, registrationId);
        long memberId = memberLinkCodeService.consume(code);
        registration.connectBusinessCard(registration.getBusinessCardProfileUrl(), memberId);
        audit(adminId, eventId, registrationId);
        return describe(registration);
    }

    @Transactional
    public EventBusinessCardResult disconnectMember(long adminId, long eventId, long registrationId) {
        EventRegistration registration = registrationForUpdate(eventId, registrationId);
        registration.connectBusinessCard(registration.getBusinessCardProfileUrl(), null);
        audit(adminId, eventId, registrationId);
        return describe(registration);
    }

    private EventRegistration registrationForUpdate(long eventId, long registrationId) {
        return repository.findByIdForUpdate(registrationId)
                .filter(candidate -> candidate.getEventId() == eventId && candidate.isBusinessCardRequested())
                .orElseThrow(EventBusinessCardService::notFound);
    }

    private void audit(long adminId, long eventId, long registrationId) {
        auditLogRepository.save(new AdminAuditLog(
                adminId, AdminAction.EVENT_BUSINESS_CARD_CONNECTED, "EVENT_REGISTRATION", registrationId,
                "이벤트 %d 명함 연결 변경".formatted(eventId)
        ));
    }

    private static boolean isUuid(String value) {
        try {
            return value != null && UUID.fromString(value).toString().equals(value);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private String absoluteProfileUrl(String profileUrl) {
        return profileUrl != null && profileUrl.startsWith("/actors/@") ? baseUrl + profileUrl : profileUrl;
    }

    private static BusinessException notFound() {
        return new BusinessException(EventErrorCode.REGISTRATION_NOT_FOUND, "명함을 찾을 수 없습니다.");
    }
}
