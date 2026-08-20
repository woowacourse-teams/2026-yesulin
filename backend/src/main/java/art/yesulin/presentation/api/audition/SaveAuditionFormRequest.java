package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.form.SaveAuditionFormCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SaveAuditionFormRequest(
        @NotNull List<@NotBlank String> basicFields,
        @NotNull List<@NotBlank String> additionalFields,
        @NotNull @Size(max = 10) List<@NotNull @Valid SavePhotoRequirementRequest> photoRequirements,
        @NotNull @Size(max = 5) List<@NotNull @Valid SaveVideoRequirementRequest> videoRequirements,
        @NotNull List<@NotNull @Valid SaveAdditionalQuestionRequest> additionalQuestions
) {

    SaveAuditionFormCommand toCommand() {
        return new SaveAuditionFormCommand(
                basicFields,
                additionalFields,
                photoRequirements.stream().map(SavePhotoRequirementRequest::toCommand).toList(),
                videoRequirements.stream().map(SaveVideoRequirementRequest::toCommand).toList(),
                additionalQuestions.stream().map(SaveAdditionalQuestionRequest::toCommand).toList()
        );
    }
}
