package art.yesulin.legacy.presentation.api.videolibrary;

import jakarta.validation.constraints.PositiveOrZero;

public record MoveVideoRequest(@PositiveOrZero int displayOrder) {
}
