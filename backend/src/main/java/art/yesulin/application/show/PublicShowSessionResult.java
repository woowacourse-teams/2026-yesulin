package art.yesulin.application.show;

import java.time.Instant;

/**
 * 관객에게 보여 줄 회차다. 공연이 잔여석을 숨기면 {@code remainingSeats}는 null이고,
 * {@code maxTicketCount}(한 번에 예매할 수 있는 최대 매수, 0이면 매진)만 준다.
 */
public record PublicShowSessionResult(
        long id,
        Instant startsAt,
        Long remainingSeats,
        int maxTicketCount,
        boolean bookable
) {
}
