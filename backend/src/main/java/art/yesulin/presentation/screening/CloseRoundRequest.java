package art.yesulin.presentation.screening;

import jakarta.validation.constraints.NotBlank;

public record CloseRoundRequest(@NotBlank String status) {
}
