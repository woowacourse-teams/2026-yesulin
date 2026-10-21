package art.yesulin.event.application;

import art.yesulin.event.domain.Event;
import java.util.function.UnaryOperator;

/** 메인 상단에 지금 보일 이벤트 배너. 누르면 이벤트 상세로 간다. */
public record EventBannerResult(
        long eventId,
        String title,
        String alt,
        String desktopImageUrl,
        String mobileImageUrl
) {

    static EventBannerResult from(Event event, UnaryOperator<String> urlOf) {
        return new EventBannerResult(
                event.getId(),
                event.getTitle(),
                event.getBannerAlt(),
                urlOf.apply(event.getBannerDesktopKey()),
                urlOf.apply(event.getBannerMobileKey())
        );
    }
}
