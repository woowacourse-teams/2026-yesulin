package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.form.SaveVideoRequirementCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record SaveVideoRequirementRequest(
        @Positive Long requirementId,
        @NotBlank @Size(max = 255) String description
) {

    SaveVideoRequirementCommand toCommand() {
        return new SaveVideoRequirementCommand(requirementId, description);
    }
}
