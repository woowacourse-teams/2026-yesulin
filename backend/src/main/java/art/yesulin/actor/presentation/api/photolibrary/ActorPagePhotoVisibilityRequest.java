package art.yesulin.actor.presentation.api.photolibrary;

import art.yesulin.actor.domain.page.ActorPagePhotoVisibility;
import jakarta.validation.constraints.NotNull;

public record ActorPagePhotoVisibilityRequest(@NotNull ActorPagePhotoVisibility visibility) {
}
