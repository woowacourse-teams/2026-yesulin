package art.yesulin.event.domain;

import static art.yesulin.event.domain.EventErrorCode.INVALID_INPUT;
import static art.yesulin.global.validation.DomainValidator.requirePositive;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 운영자가 쓰는 이벤트 글. 공개해야 이벤트 화면에 보이고, 배너 노출을 켜면 노출 종료일까지 메인 상단 배너에도 보인다.
 * 배너를 켠 글은 PC·모바일 배너 이미지와 대체 문구를 늘 함께 가진다.
 */
@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "events")
public class Event {

    public static final int MAX_TITLE_LENGTH = 100;
    public static final int MAX_SUMMARY_LENGTH = 200;
    public static final int MAX_BODY_LENGTH = 5000;
    public static final int MAX_URL_LENGTH = 500;
    public static final int MAX_APPLY_LABEL_LENGTH = 30;
    public static final int MAX_BANNER_ALT_LENGTH = 200;
    public static final int MAX_BANNER_ORDER = 99;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = MAX_TITLE_LENGTH)
    private String title;

    @Column(length = MAX_SUMMARY_LENGTH)
    private String summary;

    @Column(nullable = false, length = MAX_BODY_LENGTH)
    private String body;

    @Column(name = "starts_on")
    private LocalDate startsOn;

    @Column(name = "ends_on")
    private LocalDate endsOn;

    @Column(name = "apply_url", length = MAX_URL_LENGTH)
    private String applyUrl;

    @Column(name = "apply_label", length = MAX_APPLY_LABEL_LENGTH)
    private String applyLabel;

    @Column(name = "cover_image_key", length = 500)
    private String coverImageKey;

    @Column(name = "banner_enabled", nullable = false)
    private boolean bannerEnabled;

    @Column(name = "banner_desktop_key", length = 500)
    private String bannerDesktopKey;

    @Column(name = "banner_mobile_key", length = 500)
    private String bannerMobileKey;

    @Column(name = "banner_alt", length = MAX_BANNER_ALT_LENGTH)
    private String bannerAlt;

    @Column(name = "banner_ends_on")
    private LocalDate bannerEndsOn;

    @Column(name = "banner_order", nullable = false)
    private int bannerOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventStatus status;

    @Column(name = "created_by", nullable = false, updatable = false)
    private long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Event(EventContent content, EventBannerSetting banner, EventImages images, long createdBy, Instant now) {
        this.createdBy = requirePositive(createdBy, "만든 사람 ID는 1 이상이어야 합니다.");
        this.status = EventStatus.PENDING;
        this.createdAt = now;
        write(content, banner, images, now);
    }

    /** 내용·배너 설정·이미지를 통째로 바꾼다. 비운 항목은 지운다. 규칙에 맞지 않으면 아무것도 바꾸지 않는다. */
    public void write(EventContent content, EventBannerSetting banner, EventImages images, Instant now) {
        EventImages keys = images == null ? EventImages.none() : images;
        EventContent normalized = normalize(content);
        final EventBannerSetting setting = normalize(banner == null ? EventBannerSetting.disabled() : banner, keys);
        this.title = normalized.title();
        this.summary = normalized.summary();
        this.body = normalized.body();
        this.startsOn = normalized.startsOn();
        this.endsOn = normalized.endsOn();
        this.applyUrl = normalized.applyUrl();
        this.applyLabel = normalized.applyLabel();
        this.coverImageKey = blankToNull(keys.coverKey());
        this.bannerDesktopKey = blankToNull(keys.bannerDesktopKey());
        this.bannerMobileKey = blankToNull(keys.bannerMobileKey());
        this.bannerEnabled = setting.enabled();
        this.bannerAlt = setting.alt();
        this.bannerEndsOn = setting.endsOn();
        this.bannerOrder = setting.order();
        this.updatedAt = now;
    }

    /** 공개하거나 내린다. 공개 여부를 정한 글을 검토 전으로 되돌리지는 않는다. */
    public void changeStatus(EventStatus status, Instant now) {
        if (status == null) {
            throw invalid("공개 상태는 필수입니다.");
        }
        if (status == EventStatus.PENDING && this.status != EventStatus.PENDING) {
            throw invalid("공개 여부를 정한 이벤트는 검토 전으로 돌릴 수 없습니다.");
        }
        if (this.status != status) {
            this.status = status;
            this.updatedAt = now;
        }
    }

    public boolean isPublished() {
        return status == EventStatus.PUBLISHED;
    }

    /** 공개한 글이고 배너를 켰으며 노출 종료일이 지나지 않았으면 메인 배너에 보인다. */
    public boolean isBannerVisibleOn(LocalDate today) {
        return isPublished() && bannerEnabled && (bannerEndsOn == null || !today.isAfter(bannerEndsOn));
    }

    public EventPhase phaseOn(LocalDate today) {
        if (startsOn != null && today.isBefore(startsOn)) {
            return EventPhase.UPCOMING;
        }
        if (endsOn != null && today.isAfter(endsOn)) {
            return EventPhase.ENDED;
        }
        return EventPhase.ONGOING;
    }

    public EventImages images() {
        return new EventImages(coverImageKey, bannerDesktopKey, bannerMobileKey);
    }

    /** 내용 규칙에 맞는지 확인하고 앞뒤 공백과 빈 칸을 정리한다. 신청 링크가 없으면 버튼 문구도 지운다. */
    private static EventContent normalize(EventContent content) {
        if (content == null) {
            throw invalid("이벤트 내용은 필수입니다.");
        }
        String title = optional(content.title(), MAX_TITLE_LENGTH, "제목");
        String body = optional(normalizeLines(content.body()), MAX_BODY_LENGTH, "본문");
        if (title == null || body == null) {
            throw invalid("제목과 본문은 필수입니다.");
        }
        if (content.startsOn() != null && content.endsOn() != null && content.endsOn().isBefore(content.startsOn())) {
            throw invalid("종료일은 시작일보다 앞설 수 없습니다.");
        }
        String applyUrl = webAddress(content.applyUrl(), "신청 링크");
        return new EventContent(
                title,
                optional(content.summary(), MAX_SUMMARY_LENGTH, "요약"),
                body,
                content.startsOn(),
                content.endsOn(),
                applyUrl,
                applyUrl == null ? null : optional(content.applyLabel(), MAX_APPLY_LABEL_LENGTH, "신청 버튼 문구")
        );
    }

    /** 배너를 켜려면 PC·모바일 배너 이미지와 대체 문구가 모두 있어야 한다. */
    private static EventBannerSetting normalize(EventBannerSetting setting, EventImages keys) {
        String alt = optional(setting.alt(), MAX_BANNER_ALT_LENGTH, "배너 대체 문구");
        if (setting.enabled() && (blank(keys.bannerDesktopKey()) || blank(keys.bannerMobileKey()) || alt == null)) {
            throw invalid("배너를 노출하려면 PC·모바일 배너 이미지와 대체 문구가 모두 필요합니다.");
        }
        if (setting.order() < 0 || setting.order() > MAX_BANNER_ORDER) {
            throw invalid("배너 순서는 0부터 %d까지입니다.".formatted(MAX_BANNER_ORDER));
        }
        return new EventBannerSetting(setting.enabled(), alt, setting.endsOn(), setting.order());
    }

    /** 윈도우 줄바꿈을 한 가지로 맞춘다. 본문 안의 줄바꿈과 빈 줄은 그대로 둔다. */
    private static String normalizeLines(String value) {
        return value == null ? null : value.replace("\r\n", "\n").replace('\r', '\n');
    }

    private static String webAddress(String value, String label) {
        String address = optional(value, MAX_URL_LENGTH, label);
        if (address != null && !isWebAddress(address)) {
            throw invalid("%s는 http:// 또는 https://로 시작하는 주소여야 합니다.".formatted(label));
        }
        return address;
    }

    private static boolean isWebAddress(String value) {
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            return (scheme.equals("http") || scheme.equals("https")) && uri.getHost() != null;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static String optional(String value, int maxLength, String label) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.strip();
        if (normalized.length() > maxLength) {
            throw new BusinessException(INVALID_INPUT, "%s은(는) %d자 이내여야 합니다.", label, maxLength);
        }
        return normalized;
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String blankToNull(String value) {
        return blank(value) ? null : value;
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(INVALID_INPUT, message);
    }
}
