package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.form.SaveVideoRequirementCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record SaveVideoRequirementRequest(
        @Positive Long requirementId,
        @NotBlank(message = "영상 요구 설명을 입력해 주세요.")
        @Size(max = 255, message = "영상 요구 설명은 255자 이내로 입력해 주세요.")
        String description
) {

    SaveVideoRequirementCommand toCommand() {
        return new SaveVideoRequirementCommand(requirementId, description);
    }
}
