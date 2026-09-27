package art.yesulin.presentation.api.show;

import art.yesulin.application.show.SaveShowSessionCommand;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record SaveShowSessionRequest(@NotNull Instant startsAt, @Min(1) int capacity) {

    SaveShowSessionCommand toCommand() {
        return new SaveShowSessionCommand(startsAt, capacity);
    }
}
