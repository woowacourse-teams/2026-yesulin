package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public record SubmissionCareer(
        @Column(name = "career_year", nullable = false) int year,
        @Column(name = "title", nullable = false, columnDefinition = "text") String title,
        @Column(name = "role_name", nullable = false, columnDefinition = "text") String roleName
) {

    private static final int MINIMUM_YEAR = 1_000;
    private static final int MAXIMUM_YEAR = 9_999;

    public SubmissionCareer {
        if (year < MINIMUM_YEAR || year > MAXIMUM_YEAR) {
            throw new BusinessException(INVALID_SUBMISSION, "경력 연도는 네 자리 숫자여야 합니다.");
        }
        title = requireText(title, "경력 작품명은 필수입니다.");
        roleName = requireText(roleName, "경력 배역명은 필수입니다.");
    }
}
