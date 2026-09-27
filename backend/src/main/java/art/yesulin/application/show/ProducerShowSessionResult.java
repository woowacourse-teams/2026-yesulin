package art.yesulin.application.show;

import java.time.Instant;

public record ProducerShowSessionResult(
        long id,
        Instant startsAt,
        int capacity,
        long reservedTickets,
        boolean hasReservations
) {
}
