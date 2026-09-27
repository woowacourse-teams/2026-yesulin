package art.yesulin.application.reservation;

import java.time.Instant;

public record ReservationReceiptResult(
        String code,
        String showTitle,
        Instant startsAt,
        int ticketCount,
        String bookerName
) {
}
