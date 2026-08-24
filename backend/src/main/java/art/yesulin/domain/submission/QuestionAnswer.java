package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public record QuestionAnswer(
        @Column(name = "question_id", nullable = false) long questionId,
        @Column(name = "question", nullable = false, length = MAX_QUESTION_LENGTH) String question,
        @Column(name = "answer", nullable = false, length = MAX_ANSWER_LENGTH) String answer
) {

    public static final int MAX_QUESTION_LENGTH = 255;
    public static final int MAX_ANSWER_LENGTH = 2_000;

    public QuestionAnswer {
        questionId = requirePositive(questionId, "추가 질문 ID는 1 이상이어야 합니다.");
        question = requireText(question, "제출 질문 문구는 필수입니다.");
        if (question.length() > MAX_QUESTION_LENGTH) {
            throw new BusinessException(INVALID_SUBMISSION, "제출 질문 문구는 255자를 넘을 수 없습니다.");
        }
        answer = normalizeNullable(answer);
        if (answer.length() > MAX_ANSWER_LENGTH) {
            throw new BusinessException(INVALID_SUBMISSION, "추가 질문 답변은 2,000자를 넘을 수 없습니다.");
        }
    }

    private static String normalizeNullable(String value) {
        if (value == null) {
            return "";
        }
        return value.trim();
    }
}
