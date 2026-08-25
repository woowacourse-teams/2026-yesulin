package art.yesulin.application.submission;

import art.yesulin.domain.submission.SubmissionSummaryRow;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * 공고를 더 이상 찾을 수 없는 제출 이력도 목록에 남기므로 공고·공연·기획사에서 온 값과
 * 포스터 파일 참조는 비어 있을 수 있다.
 */
public record SubmissionSummaryResult(
        UUID submissionId,
        UUID auditionId,
        String auditionTitle,
        String performanceTitle,
        String companyName,
        Long posterOwnerId,
        Long posterFileId,
        Instant submittedAt,
        List<SubmissionSelectedRoleResult> selectedRoles
) {

    public SubmissionSummaryResult {
        selectedRoles = List.copyOf(selectedRoles);
    }

    static SubmissionSummaryResult of(SubmissionSummaryRow row, List<SubmissionSelectedRoleResult> selectedRoles) {
        return new SubmissionSummaryResult(
                row.submissionId(),
                row.auditionId(),
                row.auditionTitle(),
                row.performanceTitle(),
                row.companyName(),
                row.posterOwnerId(),
                row.posterFileId(),
                row.submittedAt(),
                selectedRoles
        );
    }
}
