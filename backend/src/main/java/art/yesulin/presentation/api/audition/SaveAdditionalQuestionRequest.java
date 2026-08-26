package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.form.SaveAdditionalQuestionCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record SaveAdditionalQuestionRequest(
        @Positive Long questionId,
        @NotBlank(message = "추가 질문 문구를 입력해 주세요.")
        @Size(max = 255, message = "추가 질문은 255자 이내로 입력해 주세요.")
        String question,
        boolean required
) {

    SaveAdditionalQuestionCommand toCommand() {
        return new SaveAdditionalQuestionCommand(questionId, question, required);
    }
}
