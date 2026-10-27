package art.yesulin.actor.presentation.api.videolibrary;

import art.yesulin.actor.domain.page.ActorPageVideoVisibility;
import jakarta.validation.constraints.NotNull;

public record ActorPageVideoVisibilityRequest(@NotNull ActorPageVideoVisibility visibility) {
}
