package art.yesulin.actor.presentation.api.page;

import jakarta.validation.constraints.NotNull;

public record ActorPagePublicationRequest(@NotNull Boolean agreed, @NotNull String consentVersion) {
}
