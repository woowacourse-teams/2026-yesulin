package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.form.SaveAdditionalQuestionCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record SaveAdditionalQuestionRequest(
        @Positive Long questionId,
        @NotBlank @Size(max = 255) String question,
        boolean required
) {

    SaveAdditionalQuestionCommand toCommand() {
        return new SaveAdditionalQuestionCommand(questionId, question, required);
    }
}
