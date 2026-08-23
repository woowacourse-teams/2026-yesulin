package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public record QuestionResponses(List<QuestionResponse> values) {

    public static final int MAX_QUESTION_COUNT = 10;

    public QuestionResponses {
        values = requireNonNull(values, "추가 질문 응답 목록은 필수입니다.");
        if (values.size() > MAX_QUESTION_COUNT) {
            throw new BusinessException(INVALID_SUBMISSION, "추가 질문 응답은 최대 10개까지 저장할 수 있습니다.");
        }
        values.forEach(value -> requireNonNull(value, "추가 질문 응답은 비어 있을 수 없습니다."));
        values = List.copyOf(values);
        validateUniqueQuestionIds(values);
    }

    private static void validateUniqueQuestionIds(List<QuestionResponse> values) {
        Set<Long> questionIds = new HashSet<>();
        if (values.stream().anyMatch(response -> !questionIds.add(response.questionId()))) {
            throw new BusinessException(INVALID_SUBMISSION, "같은 추가 질문에 여러 번 응답할 수 없습니다.");
        }
    }
}
