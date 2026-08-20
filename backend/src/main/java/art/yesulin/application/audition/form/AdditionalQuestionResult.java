package art.yesulin.application.audition.form;

import art.yesulin.domain.audition.form.AdditionalQuestion;
import art.yesulin.domain.audition.form.AdditionalQuestionPlan;

public record AdditionalQuestionResult(
        long id,
        int order,
        String question,
        boolean required,
        int answerMaxLength
) {

    static AdditionalQuestionResult from(AdditionalQuestion question, int order) {
        return new AdditionalQuestionResult(
                question.getId(), order, question.getQuestion(), question.isRequired(),
                AdditionalQuestionPlan.MAX_ANSWER_LENGTH
        );
    }
}
