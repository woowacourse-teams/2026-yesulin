package art.yesulin.operation.domain.query;

import java.time.Instant;

/**
 * 회차 하나의 예매 집계다. 예매 매수와 건수는 확정 예매만, 취소 건수는 취소된 예매만 센다.
 */
public record AdminShowSessionRow(
        long sessionId,
        Instant startsAt,
        int capacity,
        long reservedTickets,
        long reservationCount,
        long canceledReservationCount
) {
}
