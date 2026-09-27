package art.yesulin.application.show;

import java.time.Instant;

public record SaveShowSessionCommand(Instant startsAt, int capacity) {
}
