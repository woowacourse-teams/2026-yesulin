package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public record AuditionSnapshot(
        @Column(name = "audition_id", nullable = false, updatable = false) long auditionId,
        @Column(name = "audition_title", nullable = false, updatable = false, length = MAX_TITLE_LENGTH) String title
) {

    public static final int MAX_TITLE_LENGTH = 200;

    public AuditionSnapshot {
        auditionId = requirePositive(auditionId, "공고 ID는 1 이상이어야 합니다.");
        title = requireText(title, "제출 공고명은 필수입니다.");
        if (title.length() > MAX_TITLE_LENGTH) {
            throw new BusinessException(INVALID_SUBMISSION, "제출 공고명은 200자를 넘을 수 없습니다.");
        }
    }
}
