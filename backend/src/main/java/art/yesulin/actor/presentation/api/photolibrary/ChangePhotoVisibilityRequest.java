package art.yesulin.actor.presentation.api.photolibrary;

import art.yesulin.actor.domain.photolibrary.PhotoVisibility;
import jakarta.validation.constraints.NotNull;

public record ChangePhotoVisibilityRequest(@NotNull PhotoVisibility visibility) {
}
