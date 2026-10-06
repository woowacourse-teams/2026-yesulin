package art.yesulin.legacy.application.audition.form;

import art.yesulin.legacy.domain.audition.form.AdditionalQuestionPlan;

public record SaveAdditionalQuestionCommand(Long questionId, String question, boolean required) {

    AdditionalQuestionPlan toPlan() {
        return new AdditionalQuestionPlan(questionId, question, required);
    }
}
