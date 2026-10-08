package art.yesulin.show.presentation.api;

import art.yesulin.show.application.SaveShowSessionCommand;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record SaveShowSessionRequest(@NotNull Instant startsAt, @Min(1) int capacity) {

    SaveShowSessionCommand toCommand() {
        return new SaveShowSessionCommand(startsAt, capacity);
    }
}
