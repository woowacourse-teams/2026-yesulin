package art.yesulin.event.application;

import art.yesulin.event.domain.Event;
import art.yesulin.event.domain.EventPhase;
import java.time.LocalDate;
import java.util.List;
import java.util.function.UnaryOperator;

/**
 * 이벤트 상세.
 *
 * @param applyUrl 신청 버튼이 여는 주소. 없으면 버튼을 보이지 않는다.
 * @param applyLabel 신청 버튼 문구. 없으면 화면이 기본 문구를 쓴다.
 * @param registrationEnabled 참가 신청서를 쓰는 글인지. 켜면 신청 버튼이 외부 주소 대신 참가 신청서를 연다.
 * @param registrationOpen 지금 예술in 참가 신청서로 신청을 받는지. 참가 신청서를 켠 글이 마감되면 false다.
 * @param registrationNotice 참가 신청서 위에 보여 줄 안내
 */
public record PublicEventResult(
        long id,
        String title,
        String summary,
        String body,
        String detailBody,
        List<String> detailImageUrls,
        LocalDate startsOn,
        LocalDate endsOn,
        EventPhase phase,
        String applyUrl,
        String applyLabel,
        boolean registrationEnabled,
        boolean registrationOpen,
        String registrationNotice,
        String coverImageUrl
) {

    static PublicEventResult from(Event event, UnaryOperator<String> urlOf, LocalDate today) {
        return new PublicEventResult(
                event.getId(),
                event.getTitle(),
                event.getSummary(),
                event.getBody(),
                event.getDetailBody(),
                event.getDetailImageKeys().stream().map(urlOf).toList(),
                event.getStartsOn(),
                event.getEndsOn(),
                event.phaseOn(today),
                event.getApplyUrl(),
                event.getApplyLabel(),
                event.isRegistrationEnabled(),
                event.isAcceptingRegistrationsOn(today),
                event.getRegistrationNotice(),
                urlOf.apply(event.getCoverImageKey())
        );
    }
}
