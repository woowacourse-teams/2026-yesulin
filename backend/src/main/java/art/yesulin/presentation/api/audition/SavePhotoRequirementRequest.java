package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.form.SavePhotoRequirementCommand;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record SavePhotoRequirementRequest(
        @Positive Long requirementId,
        @NotBlank(message = "사진 요구 설명을 입력해 주세요.")
        @Size(max = 255, message = "사진 요구 설명은 255자 이내로 입력해 주세요.")
        String description,
        @Min(value = 1, message = "요구 장수는 1장 이상이어야 합니다.")
        @Max(value = 3, message = "요구 장수는 3장 이하여야 합니다.")
        int count
) {

    SavePhotoRequirementCommand toCommand() {
        return new SavePhotoRequirementCommand(requirementId, description, count);
    }
}
