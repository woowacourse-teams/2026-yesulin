package art.yesulin.application.show;

import java.time.Instant;

/**
 * 관객에게 보여 줄 회차다. 공연이 잔여석을 숨기면 {@code remainingSeats}는 null이고,
 * {@code maxTicketCount}(한 번에 예매할 수 있는 최대 매수, 0이면 매진)만 준다.
 * 외부 페이지에서 예매받는 공연은 {@code remainingSeats}가 null, {@code maxTicketCount}가 0이고
 * {@code bookable}은 공연이 예매 중이고 회차가 시작 전인지만 뜻한다.
 */
public record PublicShowSessionResult(
        long id,
        Instant startsAt,
        Long remainingSeats,
        int maxTicketCount,
        boolean bookable
) {
}
