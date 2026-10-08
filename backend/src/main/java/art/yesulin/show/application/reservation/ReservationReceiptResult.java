package art.yesulin.show.application.reservation;

import java.time.Instant;

public record ReservationReceiptResult(
        String code,
        String showTitle,
        Instant startsAt,
        int ticketCount,
        String bookerName
) {
}
