package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.form.SaveAuditionFormCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SaveAuditionFormRequest(
        @NotNull(message = "수집할 기본사항 목록이 필요합니다.")
        List<@NotBlank(message = "기본사항 항목이 비어 있습니다.") String> basicFields,
        @NotNull(message = "수집할 추가사항 목록이 필요합니다.")
        List<@NotBlank(message = "추가사항 항목이 비어 있습니다.") String> additionalFields,
        @NotNull(message = "사진 요구 목록이 필요합니다.")
        @Size(max = 3, message = "사진 요구는 최대 3개까지 추가할 수 있습니다.")
        List<@NotNull @Valid SavePhotoRequirementRequest> photoRequirements,
        @NotNull(message = "영상 요구 목록이 필요합니다.")
        @Size(max = 3, message = "영상 요구는 최대 3개까지 추가할 수 있습니다.")
        List<@NotNull @Valid SaveVideoRequirementRequest> videoRequirements,
        @NotNull(message = "추가 질문 목록이 필요합니다.")
        @Size(max = 10, message = "추가 질문은 최대 10개까지 추가할 수 있습니다.")
        List<@NotNull @Valid SaveAdditionalQuestionRequest> additionalQuestions
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
