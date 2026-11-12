package art.yesulin.actor.presentation.api.cheer;

import jakarta.validation.constraints.NotNull;

public record WriteCheerRequest(@NotNull String body) {
}
