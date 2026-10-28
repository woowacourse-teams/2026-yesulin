package art.yesulin.event.application;

import static art.yesulin.event.domain.EventErrorCode.NOT_FOUND;

import art.yesulin.event.application.image.EventImageService;
import art.yesulin.event.application.image.EventImageStorage;
import art.yesulin.event.application.registration.EventRegistrationService;
import art.yesulin.event.domain.Event;
import art.yesulin.event.domain.EventBannerSetting;
import art.yesulin.event.domain.EventContent;
import art.yesulin.event.domain.EventImages;
import art.yesulin.event.domain.EventRepository;
import art.yesulin.event.domain.EventStatus;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 운영자의 이벤트 글 관리와 공개 조회. 공개 조회는 운영자가 공개한 글만 보여 주고, 메인 배너는 그중 배너를 켜고 노출
 * 종료일이 지나지 않은 글만 보여 준다. 이미지는 글과 같은 트랜잭션에서 확정하고, 바뀌어 더 쓰지 않는 이미지는 커밋 뒤 지운다.
 */
@Service
@RequiredArgsConstructor
public class EventService {

    private static final int ADMIN_LIST_LIMIT = 200;
    private static final int PUBLIC_LIST_LIMIT = 100;
    /** 고정 배너와 함께 돌아가므로 이벤트 배너는 몇 개만 보인다. */
    static final int MAX_BANNERS = 5;
    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final String TARGET_TYPE = "EVENT";
    private static final Comparator<Event> BANNER_ORDER = Comparator.comparingInt(Event::getBannerOrder)
            .thenComparing(Event::getId, Comparator.reverseOrder());

    private final EventRepository repository;
    private final AdminAuditLogRepository auditLogRepository;
    private final EventImageService images;
    private final EventImageStorage imageStorage;
    private final EventRegistrationService registrations;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<AdminEventResult> findAllForAdmin() {
        LocalDate today = today();
        Set<Long> shown = shownBannerIds(today);
        List<Event> events = repository.findAllByOrderByIdDesc(PageRequest.of(0, ADMIN_LIST_LIMIT));
        Map<Long, Long> counts = registrations.counts(events.stream().map(Event::getId).toList());
        return events.stream()
                .map(event -> AdminEventResult.from(event, this::urlOf, today, shown.contains(event.getId()),
                        counts.getOrDefault(event.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminEventResult findForAdmin(long eventId) {
        return adminResult(find(eventId));
    }

    /** 새 글은 검토 전으로 만든다. 공개해야 이벤트 화면과 메인 배너에 보인다. */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public AdminEventResult create(long adminId, EventContent content, EventBannerSetting banner, EventImageUrls urls) {
        EventImages keys = resolve(adminId, EventImages.none(), urls);
        Event event = repository.save(new Event(content, banner, keys, adminId, clock.instant()));
        audit(adminId, event, AdminAction.EVENT_CREATED, "이벤트 생성");
        return adminResult(event);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public AdminEventResult update(
            long adminId, long eventId, EventContent content, EventBannerSetting banner, EventImageUrls urls
    ) {
        Event event = findForUpdate(eventId);
        EventImages previous = event.images();
        EventImages keys = resolve(adminId, previous, urls);
        event.write(content, banner, keys, clock.instant());
        previous.allKeys().stream().filter(key -> !keys.allKeys().contains(key)).forEach(images::deleteAfterCommit);
        audit(adminId, event, AdminAction.EVENT_EDITED, "이벤트 수정");
        return adminResult(event);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public AdminEventResult changeStatus(long adminId, long eventId, EventStatus status) {
        Event event = findForUpdate(eventId);
        EventStatus previous = event.getStatus();
        event.changeStatus(status, clock.instant());
        if (previous != status) {
            audit(adminId, event, AdminAction.EVENT_STATUS_CHANGED, "%s → %s".formatted(previous, status));
        }
        return adminResult(event);
    }

    /**
     * 글을 지운다. 운영자 글이라 행을 바로 지우고, 받은 참가 신청과 이미지·신청 사진도 함께(저장소는 커밋 뒤) 지운다.
     * 감사 로그는 남긴다.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void delete(long adminId, long eventId) {
        Event event = findForUpdate(eventId);
        final EventImages keys = event.images();
        audit(adminId, event, AdminAction.EVENT_DELETED, "이벤트 삭제");
        registrations.deleteAllOf(event.getId());
        repository.delete(event);
        keys.allKeys().forEach(images::deleteAfterCommit);
    }

    @Transactional(readOnly = true)
    public List<PublicEventSummaryResult> findPublished() {
        LocalDate today = today();
        List<Event> events = repository.findAllByStatusOrderByIdDesc(
                EventStatus.PUBLISHED, PageRequest.of(0, PUBLIC_LIST_LIMIT));
        Map<Long, Long> counts = registrations.counts(events.stream().map(Event::getId).toList());
        return events.stream()
                .map(event -> PublicEventSummaryResult.from(event, this::urlOf, today,
                        counts.getOrDefault(event.getId(), 0L)))
                .toList();
    }

    /** 공개하지 않은 글은 없는 글처럼 404다. */
    @Transactional(readOnly = true)
    public PublicEventResult findPublic(long eventId) {
        return repository.findById(eventId)
                .filter(Event::isPublished)
                .map(event -> PublicEventResult.from(
                        event, this::urlOf, today(), clock.instant(), registrations.count(event.getId())))
                .orElseThrow(this::notFound);
    }

    @Transactional(readOnly = true)
    public List<EventBannerResult> findBanners() {
        return shownBanners(today()).stream()
                .map(event -> EventBannerResult.from(event, this::urlOf))
                .toList();
    }

    /** 지금 메인 배너에 보일 이벤트. 배너 순서가 작은 것부터, 같으면 최근 글부터 {@value #MAX_BANNERS}개까지다. */
    private List<Event> shownBanners(LocalDate today) {
        return repository.findAllByStatusAndBannerEnabledTrue(EventStatus.PUBLISHED).stream()
                .filter(event -> event.isBannerCandidateOn(today))
                .sorted(BANNER_ORDER)
                .limit(MAX_BANNERS)
                .toList();
    }

    private Set<Long> shownBannerIds(LocalDate today) {
        return shownBanners(today).stream().map(Event::getId).collect(Collectors.toSet());
    }

    /** 운영 화면의 배너 노출 표시는 메인 배너와 같은 기준(5개 제한 포함)으로 정한다. */
    private AdminEventResult adminResult(Event event) {
        LocalDate today = today();
        return AdminEventResult.from(event, this::urlOf, today, shownBannerIds(today).contains(event.getId()),
                registrations.count(event.getId()));
    }

    private EventImages resolve(long adminId, EventImages current, EventImageUrls urls) {
        EventImageUrls requested = urls == null ? new EventImageUrls(null, null, null) : urls;
        // 이미지 확정 전에 개수·빈 주소·중복을 확인한다. URL과 키는 같은 목록 규칙을 따른다.
        new EventImages(null, null, null, requested.detailUrls());
        Map<String, String> known = new HashMap<>();
        current.allKeys().forEach(key -> known.put(imageStorage.publicUrl(key), key));
        return new EventImages(
                resolve(adminId, known, requested.coverUrl()),
                resolve(adminId, known, requested.bannerDesktopUrl()),
                resolve(adminId, known, requested.bannerMobileUrl()),
                requested.detailUrls().stream().map(url -> resolve(adminId, known, url)).toList()
        );
    }

    /** 같은 이벤트에서 유지하거나 위치를 바꾼 이미지는 재확정하지 않고, 새 이미지는 올린 운영자만 확정한다. */
    private String resolve(long adminId, Map<String, String> known, String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        return known.computeIfAbsent(url, requested -> images.claim(adminId, requested));
    }

    private String urlOf(String objectKey) {
        return objectKey == null ? null : imageStorage.publicUrl(objectKey);
    }

    /** 정원 변경·수동 마감·신청·삭제는 같은 이벤트 행 잠금 뒤에 최신 신청 수를 읽는다. */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public AdminEventResult changeRegistrationClosed(long adminId, long eventId, boolean closed) {
        Event event = findForUpdate(eventId);
        boolean previous = event.isRegistrationClosed();
        event.changeRegistrationClosed(closed, clock.instant());
        if (previous != closed) {
            audit(adminId, event, AdminAction.EVENT_REGISTRATION_STATUS_CHANGED, closed ? "모집 마감" : "모집 재개");
        }
        return adminResult(event);
    }

    private Event findForUpdate(long eventId) {
        return repository.findByIdForUpdate(eventId).orElseThrow(this::notFound);
    }

    private Event find(long eventId) {
        return repository.findById(eventId).orElseThrow(this::notFound);
    }

    private void audit(long adminId, Event event, AdminAction action, String detail) {
        auditLogRepository.save(new AdminAuditLog(adminId, action, TARGET_TYPE, event.getId(), detail));
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(KOREA));
    }

    private BusinessException notFound() {
        return new BusinessException(NOT_FOUND, "이벤트를 찾을 수 없습니다.");
    }
}
