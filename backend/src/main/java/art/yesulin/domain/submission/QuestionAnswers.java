package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Embeddable
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QuestionAnswers {

    public static final int MAX_QUESTION_COUNT = 10;

    @Column(name = "question_answers_present", nullable = false, updatable = false)
    private boolean present = true;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "submission_question_answers", joinColumns = @JoinColumn(name = "submission_id"))
    @OrderColumn(name = "answer_order")
    private List<QuestionAnswer> values = new ArrayList<>();

    public QuestionAnswers(List<QuestionAnswer> values) {
        List<QuestionAnswer> safeValues = requireNonNull(values, "추가 질문 답변 목록은 필수입니다.");
        if (safeValues.size() > MAX_QUESTION_COUNT) {
            throw new BusinessException(INVALID_SUBMISSION, "추가 질문 답변은 최대 10개까지 저장할 수 있습니다.");
        }
        safeValues.forEach(value -> requireNonNull(value, "추가 질문 답변은 비어 있을 수 없습니다."));
        validateUniqueQuestionIds(safeValues);
        this.values = new ArrayList<>(safeValues);
    }

    private static void validateUniqueQuestionIds(List<QuestionAnswer> values) {
        Set<Long> questionIds = new HashSet<>();
        if (values.stream().anyMatch(answer -> !questionIds.add(answer.questionId()))) {
            throw new BusinessException(INVALID_SUBMISSION, "같은 추가 질문에 여러 번 답변할 수 없습니다.");
        }
    }

    public List<QuestionAnswer> values() {
        return List.copyOf(values);
    }
}
