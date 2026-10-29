package art.yesulin.event.application.registration;

import static art.yesulin.event.domain.EventErrorCode.BUSINESS_CARD_CLOSED;
import static art.yesulin.event.domain.EventErrorCode.INVALID_INPUT;
import static art.yesulin.event.domain.EventErrorCode.NOT_FOUND;
import static art.yesulin.event.domain.EventErrorCode.REGISTRATION_CLOSED;
import static art.yesulin.event.domain.EventErrorCode.REGISTRATION_DUPLICATE;
import static art.yesulin.event.domain.EventErrorCode.REGISTRATION_NOT_FOUND;

import art.yesulin.event.application.registration.EventRegistrationPhotoStorage.PreparedPhoto;
import art.yesulin.event.domain.Event;
import art.yesulin.event.domain.EventRegistrationStatus;
import art.yesulin.event.domain.EventRepository;
import art.yesulin.event.domain.image.EventImageRules;
import art.yesulin.event.domain.registration.EventParticipantType;
import art.yesulin.event.domain.registration.EventPaymentStatus;
import art.yesulin.event.domain.registration.EventRegistration;
import art.yesulin.event.domain.registration.EventRegistrationForm;
import art.yesulin.event.domain.registration.EventRegistrationPhotoUpload;
import art.yesulin.event.domain.registration.EventRegistrationPhotoUploadRepository;
import art.yesulin.event.domain.registration.EventRegistrationRepository;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * 로그인 없이 받는 이벤트 참가 신청. 공개했고 참가 신청서를 켰으며 종료일이 지나지 않은 이벤트만 받는다.
 * 배우의 프로필 사진은 브라우저가 비공개 경로로 바로 올리고, 신청을 보낼 때 업로드 키로 한 번 확정한다.
 * 운영자는 이벤트별 신청자를 보고 지울 수 있으며, 지운 신청의 사진은 커밋 뒤 저장소에서 지운다.
 */
@Service
@RequiredArgsConstructor
public class EventRegistrationService {

    /** 신청서를 오래 열어 둘 수 있으므로 하루는 기다린 뒤 정리한다. */
    static final Duration UNCLAIMED_RETENTION = Duration.ofDays(1);
    private static final int CLEANUP_BATCH_SIZE = 200;
    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final String TARGET_TYPE = "EVENT_REGISTRATION";

    private final EventRepository eventRepository;
    private final EventRegistrationRepository repository;
    private final EventRegistrationPhotoUploadRepository uploadRepository;
    private final EventRegistrationPhotoStorage storage;
    private final AdminAuditLogRepository auditLogRepository;
    private final Clock clock;
    private final EventBusinessCardService businessCardService;
    private final ApplicationEventPublisher eventPublisher;

    /** 신청을 받고 명함 제작 마감 전인 이벤트에서만 명함 사진 올릴 자리를 준다. */
    @Transactional
    public EventRegistrationPhotoUploadResult preparePhotoUpload(long eventId, String reportedType, long size) {
        requireBusinessCardOpen(acceptingEvent(eventId, false));
        String contentType = EventImageRules.contentType(reportedType).orElseThrow(() ->
                new BusinessException(INVALID_INPUT, "사진은 JPG·PNG·WebP만 올릴 수 있습니다."));
        if (size <= 0 || size > EventImageRules.MAX_BYTES) {
            throw new BusinessException(
                    INVALID_INPUT, "사진은 %dMB까지 올릴 수 있습니다.", EventImageRules.MAX_BYTES / 1024 / 1024
            );
        }
        PreparedPhoto prepared = storage.prepare(contentType, size);
        uploadRepository.save(new EventRegistrationPhotoUpload(
                prepared.objectKey(), contentType, size, clock.instant()
        ));
        return EventRegistrationPhotoUploadResult.of(prepared.upload(), prepared.objectKey());
    }

    /**
     * 참가 신청을 저장하고 신청 번호를 준다. 같은 이벤트에 같은 휴대폰 번호로 다시 신청하면 거절한다.
     *
     * @param photoUploadKey 명함을 희망한 배우가 올린 프로필 사진의 업로드 키. 그 밖에는 무시한다.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public long register(long eventId, EventRegistrationForm form, String photoUploadKey, boolean privacyAgreed) {
        Event event = acceptingEvent(eventId, true);
        if (!privacyAgreed) {
            throw new BusinessException(INVALID_INPUT, "개인정보 수집·이용에 동의해 주세요.");
        }
        String phone = form == null ? null : EventRegistration.normalizePhone(form.phone());
        if (phone != null && repository.existsByEventIdAndPhone(event.getId(), phone)) {
            throw duplicate();
        }
        boolean card = form != null && form.participantType() == EventParticipantType.ACTOR
                && form.businessCardRequested();
        if (card) {
            requireBusinessCardOpen(event);
        }
        String photoKey = card && photoUploadKey != null && !photoUploadKey.isBlank()
                ? claimPhoto(photoUploadKey)
                : null;
        EventRegistration registration = new EventRegistration(event.getId(), form, photoKey, today(), clock.instant());
        try {
            long id = repository.saveAndFlush(registration).getId();
            eventPublisher.publishEvent(new EventRegisteredEvent(
                    event.getId(), event.getTitle(), id, registration.getParticipantType(),
                    registration.isBusinessCardRequested()
            ));
            return id;
        } catch (DataIntegrityViolationException exception) {
            throw duplicate();
        }
    }

    /** 목록 전체의 접수 수를 한 번에 조회해 이벤트별로 정리한다. */
    public Map<Long, Long> counts(List<Long> eventIds) {
        if (eventIds.isEmpty()) {
            return Map.of();
        }
        return repository.countForEventIds(eventIds).stream().collect(Collectors.toMap(
                EventRegistrationRepository.RegistrationCount::getEventId,
                EventRegistrationRepository.RegistrationCount::getTotal
        ));
    }

    public long count(long eventId) {
        return repository.countByEventId(eventId);
    }

    /** 입금 확인을 저장한다. 접수 순서와 정원 계산은 입금 여부로 달라지지 않는다. */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public AdminEventRegistrationResult changePaymentStatus(
            long adminId, long eventId, long registrationId, EventPaymentStatus status
    ) {
        eventRepository.findByIdForUpdate(eventId).orElseThrow(EventRegistrationService::eventNotFound);
        EventRegistration registration = repository.findById(registrationId)
                .filter(candidate -> candidate.getEventId() == eventId)
                .orElseThrow(() -> new BusinessException(REGISTRATION_NOT_FOUND, "참가 신청을 찾을 수 없습니다."));
        EventPaymentStatus previous = registration.getPaymentStatus();
        if (registration.changePaymentStatus(status, clock.instant())) {
            auditLogRepository.save(new AdminAuditLog(adminId, AdminAction.EVENT_REGISTRATION_PAYMENT_CHANGED,
                    TARGET_TYPE, registration.getId(), "%s → %s".formatted(previous, status)));
        }
        return AdminEventRegistrationResult.from(registration,
                registration.getPhotoKey() == null ? null : storage.downloadUrl(registration.getPhotoKey()),
                businessCardService.describe(registration));
    }

    /** 이벤트의 참가 신청을 먼저 온 순서로 준다. 사진은 잠깐 열리는 내려받기 주소로 준다. */
    @Transactional(readOnly = true)
    public List<AdminEventRegistrationResult> findAllForAdmin(long eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw eventNotFound();
        }
        return repository.findAllByEventIdOrderByIdAsc(eventId).stream()
                .map(registration -> AdminEventRegistrationResult.from(
                        registration,
                        registration.getPhotoKey() == null ? null : storage.downloadUrl(registration.getPhotoKey()),
                        businessCardService.describe(registration)
                ))
                .toList();
    }

    /**
     * 명함 자료 내려받기에 담을 명함 희망 배우를 먼저 온 순서로 준다. 개인정보를 내보내므로 감사 로그를 남긴다(내용은 담지 않는다).
     */
    @Transactional
    public List<BusinessCardEntry> prepareBusinessCardExport(long adminId, long eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw eventNotFound();
        }
        List<BusinessCardEntry> entries = repository.findAllByEventIdOrderByIdAsc(eventId).stream()
                .filter(EventRegistration::isBusinessCardRequested)
                .map(BusinessCardEntry::from)
                .toList();
        auditLogRepository.save(new AdminAuditLog(
                adminId, AdminAction.EVENT_REGISTRATION_EXPORTED, "EVENT", eventId,
                "명함 자료 %d명 내려받기".formatted(entries.size())
        ));
        return entries;
    }

    /** 신청을 지운다. 되돌릴 수 없고, 사진은 커밋 뒤 저장소에서 지운다. 감사 로그에는 신청 내용을 담지 않는다. */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void delete(long adminId, long eventId, long registrationId) {
        eventRepository.findByIdForUpdate(eventId).orElseThrow(EventRegistrationService::eventNotFound);
        EventRegistration registration = repository.findById(registrationId)
                .filter(candidate -> candidate.getEventId() == eventId)
                .orElseThrow(() -> new BusinessException(REGISTRATION_NOT_FOUND, "참가 신청을 찾을 수 없습니다."));
        auditLogRepository.save(new AdminAuditLog(
                adminId, AdminAction.EVENT_REGISTRATION_DELETED, TARGET_TYPE, registration.getId(),
                "이벤트 %d 참가 신청 삭제".formatted(eventId)
        ));
        repository.delete(registration);
        deletePhotoAfterCommit(registration.getPhotoKey());
    }

    /** 이벤트를 지울 때 그 이벤트의 참가 신청과 사진도 함께 지운다. */
    @Transactional
    public void deleteAllOf(long eventId) {
        List<EventRegistration> registrations = repository.findAllByEventIdOrderByIdAsc(eventId);
        repository.deleteAll(registrations);
        registrations.forEach(registration -> deletePhotoAfterCommit(registration.getPhotoKey()));
    }

    /** 확정하지 않은 채 하루가 지난 사진 업로드를 지운다. 저장소에서 지우지 못한 것은 다음에 다시 시도한다. */
    @Transactional
    public int deleteUnclaimedPhotos() {
        List<EventRegistrationPhotoUpload> expired = uploadRepository.findAllByCreatedAtBeforeOrderByIdAsc(
                clock.instant().minus(UNCLAIMED_RETENTION), PageRequest.of(0, CLEANUP_BATCH_SIZE)
        );
        List<EventRegistrationPhotoUpload> deleted = expired.stream()
                .filter(upload -> storage.tryDelete(upload.getObjectKey()))
                .toList();
        uploadRepository.deleteAll(deleted);
        return deleted.size();
    }

    private String claimPhoto(String uploadKey) {
        if (!storage.isKey(uploadKey)) {
            throw photoRejected();
        }
        EventRegistrationPhotoUpload upload = uploadRepository.findByObjectKey(uploadKey)
                .orElseThrow(EventRegistrationService::photoRejected);
        if (!storage.confirm(uploadKey, upload.getContentType(), upload.getSize())) {
            throw new BusinessException(INVALID_INPUT, "사진을 다 올리지 못했거나 사진 파일이 아닙니다. 다시 올려 주세요.");
        }
        uploadRepository.delete(upload);
        return uploadKey;
    }

    private void deletePhotoAfterCommit(String objectKey) {
        if (objectKey == null) {
            return;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            storage.tryDelete(objectKey);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                storage.tryDelete(objectKey);
            }
        });
    }

    /** 공개하지 않은 이벤트는 없는 이벤트처럼 404, 신청서를 끄거나 종료일이 지난 이벤트는 409다. */
    private Event acceptingEvent(long eventId, boolean lock) {
        Event event = (lock ? eventRepository.findByIdForUpdate(eventId) : eventRepository.findById(eventId))
                .filter(Event::isPublished)
                .orElseThrow(EventRegistrationService::eventNotFound);
        EventRegistrationStatus status = event.registrationStatusOn(today(), repository.countByEventId(eventId));
        if (status != EventRegistrationStatus.OPEN) {
            String message = status == EventRegistrationStatus.FULL
                    ? "선착순 모집 정원이 마감되었습니다." : "참가 신청을 받지 않는 이벤트입니다.";
            throw new BusinessException(REGISTRATION_CLOSED, message);
        }
        return event;
    }

    /** 명함 제작 마감 시각이 지나면 명함 희망을 받지 않는다. 참가 신청 자체는 종료일까지 받는다. */
    private void requireBusinessCardOpen(Event event) {
        if (!event.isAcceptingBusinessCardsAt(clock.instant())) {
            throw new BusinessException(
                    BUSINESS_CARD_CLOSED, "프로필 명함 제작 신청 기간이 끝났습니다. 명함 희망을 끄고 신청해 주십시오."
            );
        }
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(KOREA));
    }

    private static BusinessException duplicate() {
        return new BusinessException(REGISTRATION_DUPLICATE, "이미 이 휴대폰 번호로 신청했습니다.");
    }

    private static BusinessException eventNotFound() {
        return new BusinessException(NOT_FOUND, "이벤트를 찾을 수 없습니다.");
    }

    /** 이 신청서에서 올린 사진이 아니거나 이미 쓴 사진이다. */
    private static BusinessException photoRejected() {
        return new BusinessException(INVALID_INPUT, "사진을 찾을 수 없습니다. 다시 올려 주세요.");
    }
}
