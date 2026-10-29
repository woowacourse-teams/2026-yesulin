package art.yesulin.actor.presentation.api.page;

import jakarta.validation.constraints.NotNull;

public record ActorPageHandleRequest(@NotNull String handle) {
}
