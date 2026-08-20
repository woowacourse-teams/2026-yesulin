package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.form.SavePhotoRequirementCommand;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record SavePhotoRequirementRequest(
        @Positive Long requirementId,
        @NotBlank @Size(max = 255) String description,
        @Min(1) @Max(10) int count
) {

    SavePhotoRequirementCommand toCommand() {
        return new SavePhotoRequirementCommand(requirementId, description, count);
    }
}
