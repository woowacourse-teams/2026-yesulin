package art.yesulin.actor.presentation.api.videolibrary;

import art.yesulin.actor.domain.videolibrary.VideoVisibility;
import jakarta.validation.constraints.NotNull;

public record ChangeVideoVisibilityRequest(@NotNull VideoVisibility visibility) {
}
