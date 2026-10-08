package art.yesulin.timetable.presentation.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTimeRequestRequest(@NotBlank @Size(max = 300) String message) {
}
