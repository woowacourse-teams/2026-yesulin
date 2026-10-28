package art.yesulin.event.application;

import art.yesulin.event.domain.Event;
import art.yesulin.event.domain.EventPhase;
import art.yesulin.event.domain.EventStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.function.UnaryOperator;

/**
 * 운영 화면의 이벤트 글.
 *
 * @param bannerVisible 지금 메인 배너에 보이는지. 공개 상태·노출 종료일과 메인 배너 개수 제한까지 본 결과다.
 */
public record AdminEventResult(
        long id,
        String title,
        String summary,
        String body,
        String detailBody,
        List<String> detailImageUrls,
        LocalDate startsOn,
        LocalDate endsOn,
        String applyUrl,
        String applyLabel,
        boolean registrationEnabled,
        String registrationNotice,
        Instant businessCardClosesAt,
        String coverImageUrl,
        Banner banner,
        boolean bannerVisible,
        EventStatus status,
        EventPhase phase,
        Instant createdAt,
        Instant updatedAt,
        boolean registrationConfirmationEnabled,
        String registrationConfirmationMessage
) {

    static AdminEventResult from(Event event, UnaryOperator<String> urlOf, LocalDate today, boolean bannerVisible) {
        return new AdminEventResult(
                event.getId(),
                event.getTitle(),
                event.getSummary(),
                event.getBody(),
                event.getDetailBody(),
                event.getDetailImageKeys().stream().map(urlOf).toList(),
                event.getStartsOn(),
                event.getEndsOn(),
                event.getApplyUrl(),
                event.getApplyLabel(),
                event.isRegistrationEnabled(),
                event.getRegistrationNotice(),
                event.getBusinessCardClosesAt(),
                urlOf.apply(event.getCoverImageKey()),
                new Banner(
                        event.isBannerEnabled(),
                        urlOf.apply(event.getBannerDesktopKey()),
                        urlOf.apply(event.getBannerMobileKey()),
                        event.getBannerAlt(),
                        event.getBannerEndsOn(),
                        event.getBannerOrder()
                ),
                bannerVisible,
                event.getStatus(),
                event.phaseOn(today),
                event.getCreatedAt(),
                event.getUpdatedAt(),
                event.isRegistrationConfirmationEnabled(),
                event.getRegistrationConfirmationMessage()
        );
    }

    public record Banner(
            boolean enabled,
            String desktopImageUrl,
            String mobileImageUrl,
            String alt,
            LocalDate endsOn,
            int order
    ) {
    }
}
