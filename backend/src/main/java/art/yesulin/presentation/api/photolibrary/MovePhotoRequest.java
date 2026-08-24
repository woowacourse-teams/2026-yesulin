package art.yesulin.presentation.api.photolibrary;

import jakarta.validation.constraints.PositiveOrZero;

public record MovePhotoRequest(@PositiveOrZero int displayOrder) {
}
