package art.yesulin.actor.presentation.api.videolibrary;

import jakarta.validation.constraints.PositiveOrZero;

public record MoveVideoRequest(@PositiveOrZero int displayOrder) {
}
