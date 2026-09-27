package art.yesulin.application.show;

import java.time.Instant;

public record PublicShowSessionResult(long id, Instant startsAt, long remainingSeats, boolean bookable) {
}
