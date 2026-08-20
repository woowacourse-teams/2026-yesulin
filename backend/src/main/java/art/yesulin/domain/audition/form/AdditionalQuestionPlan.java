package art.yesulin.domain.audition.form;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_FORM;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import art.yesulin.common.exception.BusinessException;

public record AdditionalQuestionPlan(Long questionId, String question, boolean required) {

    static final int MAX_QUESTION_LENGTH = 255;
    public static final int MAX_ANSWER_LENGTH = 2_000;

    public AdditionalQuestionPlan {
        if (questionId != null && questionId < 1) {
            throw new BusinessException(INVALID_FORM, "추가 질문 ID는 1 이상이어야 합니다.");
        }
        question = requireText(question, "추가 질문은 필수입니다.");
        if (question.length() > MAX_QUESTION_LENGTH) {
            throw new BusinessException(INVALID_FORM, "추가 질문은 255자를 넘을 수 없습니다.");
        }
    }
}
