package art.yesulin.application.audition.form;

import art.yesulin.domain.audition.form.AdditionalQuestionPlan;

public record SaveAdditionalQuestionCommand(Long questionId, String question, boolean required) {

    AdditionalQuestionPlan toPlan() {
        return new AdditionalQuestionPlan(questionId, question, required);
    }
}
