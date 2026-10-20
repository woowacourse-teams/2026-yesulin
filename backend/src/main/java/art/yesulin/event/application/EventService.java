package art.yesulin.event.application;

import static art.yesulin.event.domain.EventErrorCode.NOT_FOUND;

import art.yesulin.event.application.image.EventImageService;
import art.yesulin.event.application.image.EventImageStorage;
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
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
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
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<AdminEventResult> findAllForAdmin() {
        LocalDate today = today();
        return repository.findAllByOrderByIdDesc(PageRequest.of(0, ADMIN_LIST_LIMIT)).stream()
                .map(event -> AdminEventResult.from(event, this::urlOf, today))
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminEventResult findForAdmin(long eventId) {
        return AdminEventResult.from(find(eventId), this::urlOf, today());
    }

    /** 새 글은 검토 전으로 만든다. 공개해야 이벤트 화면과 메인 배너에 보인다. */
    @Transactional
    public AdminEventResult create(long adminId, EventContent content, EventBannerSetting banner, EventImageUrls urls) {
        EventImages keys = resolve(adminId, EventImages.none(), urls);
        Event event = repository.save(new Event(content, banner, keys, adminId, clock.instant()));
        audit(adminId, event, AdminAction.EVENT_CREATED, "이벤트 생성");
        return AdminEventResult.from(event, this::urlOf, today());
    }

    @Transactional
    public AdminEventResult update(
            long adminId, long eventId, EventContent content, EventBannerSetting banner, EventImageUrls urls
    ) {
        Event event = find(eventId);
        EventImages previous = event.images();
        EventImages keys = resolve(adminId, previous, urls);
        event.write(content, banner, keys, clock.instant());
        deleteReplaced(previous.coverKey(), keys.coverKey());
        deleteReplaced(previous.bannerDesktopKey(), keys.bannerDesktopKey());
        deleteReplaced(previous.bannerMobileKey(), keys.bannerMobileKey());
        audit(adminId, event, AdminAction.EVENT_EDITED, "이벤트 수정");
        return AdminEventResult.from(event, this::urlOf, today());
    }

    @Transactional
    public AdminEventResult changeStatus(long adminId, long eventId, EventStatus status) {
        Event event = find(eventId);
        EventStatus previous = event.getStatus();
        event.changeStatus(status, clock.instant());
        if (previous != status) {
            audit(adminId, event, AdminAction.EVENT_STATUS_CHANGED, "%s → %s".formatted(previous, status));
        }
        return AdminEventResult.from(event, this::urlOf, today());
    }

    @Transactional(readOnly = true)
    public List<PublicEventSummaryResult> findPublished() {
        LocalDate today = today();
        return repository.findAllByStatusOrderByIdDesc(EventStatus.PUBLISHED, PageRequest.of(0, PUBLIC_LIST_LIMIT))
                .stream()
                .map(event -> PublicEventSummaryResult.from(event, this::urlOf, today))
                .toList();
    }

    /** 공개하지 않은 글은 없는 글처럼 404다. */
    @Transactional(readOnly = true)
    public PublicEventResult findPublic(long eventId) {
        return repository.findById(eventId)
                .filter(Event::isPublished)
                .map(event -> PublicEventResult.from(event, this::urlOf, today()))
                .orElseThrow(this::notFound);
    }

    /** 지금 메인 배너에 보일 이벤트. 배너 순서가 작은 것부터, 같으면 최근 글부터 {@value #MAX_BANNERS}개까지다. */
    @Transactional(readOnly = true)
    public List<EventBannerResult> findBanners() {
        LocalDate today = today();
        return repository.findAllByStatusAndBannerEnabledTrue(EventStatus.PUBLISHED).stream()
                .filter(event -> event.isBannerVisibleOn(today))
                .sorted(BANNER_ORDER)
                .limit(MAX_BANNERS)
                .map(event -> EventBannerResult.from(event, this::urlOf))
                .toList();
    }

    private EventImages resolve(long adminId, EventImages current, EventImageUrls urls) {
        EventImageUrls requested = urls == null ? new EventImageUrls(null, null, null) : urls;
        return new EventImages(
                resolve(adminId, current.coverKey(), requested.coverUrl()),
                resolve(adminId, current.bannerDesktopKey(), requested.bannerDesktopUrl()),
                resolve(adminId, current.bannerMobileKey(), requested.bannerMobileUrl())
        );
    }

    /** 비었으면 지우고, 지금 이미지 주소면 그대로 두고, 아니면 이 운영자가 올린 이미지로 확정한다. */
    private String resolve(long adminId, String currentKey, String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        if (currentKey != null && imageStorage.publicUrl(currentKey).equals(url)) {
            return currentKey;
        }
        return images.claim(adminId, url);
    }

    private void deleteReplaced(String previousKey, String currentKey) {
        if (previousKey != null && !Objects.equals(previousKey, currentKey)) {
            images.deleteAfterCommit(previousKey);
        }
    }

    private String urlOf(String objectKey) {
        return objectKey == null ? null : imageStorage.publicUrl(objectKey);
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
