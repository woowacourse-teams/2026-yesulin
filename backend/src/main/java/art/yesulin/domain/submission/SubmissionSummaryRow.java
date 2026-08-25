package art.yesulin.domain.submission;

import java.time.Instant;
import java.util.UUID;

/**
 * 배우 본인의 지원서 목록 읽기 모델이다. 공고가 삭제되었더라도 제출 이력은 감추지 않으므로
 * 공고·공연·기획사에서 온 값은 비어 있을 수 있다.
 */
public record SubmissionSummaryRow(
        Long submissionDatabaseId,
        UUID submissionId,
        UUID auditionId,
        String auditionTitle,
        String performanceTitle,
        String companyName,
        Long posterOwnerId,
        Long posterFileId,
        Instant submittedAt
) {
}
