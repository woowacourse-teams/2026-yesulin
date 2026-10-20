package art.yesulin.event.application;

import art.yesulin.event.domain.Event;
import art.yesulin.event.domain.EventPhase;
import java.time.LocalDate;
import java.util.function.UnaryOperator;

/**
 * 이벤트 상세.
 *
 * @param applyUrl 신청 버튼이 여는 주소. 없으면 버튼을 보이지 않는다.
 * @param applyLabel 신청 버튼 문구. 없으면 화면이 기본 문구를 쓴다.
 */
public record PublicEventResult(
        long id,
        String title,
        String summary,
        String body,
        LocalDate startsOn,
        LocalDate endsOn,
        EventPhase phase,
        String applyUrl,
        String applyLabel,
        String coverImageUrl
) {

    static PublicEventResult from(Event event, UnaryOperator<String> urlOf, LocalDate today) {
        return new PublicEventResult(
                event.getId(),
                event.getTitle(),
                event.getSummary(),
                event.getBody(),
                event.getStartsOn(),
                event.getEndsOn(),
                event.phaseOn(today),
                event.getApplyUrl(),
                event.getApplyLabel(),
                urlOf.apply(event.getCoverImageKey())
        );
    }
}
