package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Embeddable
public record AuditionSnapshot(
        @Column(name = "audition_id", nullable = false, updatable = false) long auditionId,
        @JdbcTypeCode(SqlTypes.VARCHAR)
        @Column(name = "audition_public_id", nullable = false, updatable = false, length = 36)
        UUID publicAuditionId,
        @Column(name = "audition_title", nullable = false, updatable = false, length = MAX_TITLE_LENGTH)
        String title,
        @Column(name = "performance_title", nullable = false, updatable = false, length = MAX_TITLE_LENGTH)
        String performanceTitle,
        @Column(name = "company_name", nullable = false, updatable = false, length = MAX_COMPANY_NAME_LENGTH)
        String companyName,
        @Column(name = "poster_file_id", nullable = false, updatable = false)
        long posterFileId,
        @Column(name = "poster_owner_id", nullable = false, updatable = false)
        long posterOwnerId
) {

    public static final int MAX_TITLE_LENGTH = 200;
    public static final int MAX_COMPANY_NAME_LENGTH = 100;

    public AuditionSnapshot {
        auditionId = requirePositive(auditionId, "공고 ID는 1 이상이어야 합니다.");
        publicAuditionId = requireNonNull(publicAuditionId, "공고 공개 ID는 필수입니다.");
        title = requireText(title, "제출 공고명은 필수입니다.");
        performanceTitle = requireText(performanceTitle, "제출 공연명은 필수입니다.");
        companyName = requireText(companyName, "제출 기획사·제작사명은 필수입니다.");
        posterFileId = requirePositive(posterFileId, "제출 포스터 파일 ID는 1 이상이어야 합니다.");
        posterOwnerId = requirePositive(posterOwnerId, "제출 포스터 소유자 ID는 1 이상이어야 합니다.");
        if (title.length() > MAX_TITLE_LENGTH) {
            throw new BusinessException(INVALID_SUBMISSION, "제출 공고명은 200자를 넘을 수 없습니다.");
        }
        if (performanceTitle.length() > MAX_TITLE_LENGTH) {
            throw new BusinessException(INVALID_SUBMISSION, "제출 공연명은 200자를 넘을 수 없습니다.");
        }
        if (companyName.length() > MAX_COMPANY_NAME_LENGTH) {
            throw new BusinessException(INVALID_SUBMISSION, "제출 기획사·제작사명은 100자를 넘을 수 없습니다.");
        }
    }
}
