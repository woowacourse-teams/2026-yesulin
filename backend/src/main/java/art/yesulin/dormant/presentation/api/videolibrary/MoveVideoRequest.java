package art.yesulin.dormant.presentation.api.videolibrary;

import jakarta.validation.constraints.PositiveOrZero;

public record MoveVideoRequest(@PositiveOrZero int displayOrder) {
}
