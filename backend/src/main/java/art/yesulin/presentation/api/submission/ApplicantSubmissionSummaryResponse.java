package art.yesulin.presentation.api.submission;

import art.yesulin.application.submission.SubmissionSelectedRoleResult;
import art.yesulin.application.submission.SubmissionSummaryResult;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * 공고를 더 이상 찾을 수 없는 제출 이력도 목록에 남기므로 공고 식별자와 공연·기획사·포스터 값은
 * 비어 있을 수 있다. 공고명은 제출 스냅샷이라 항상 존재한다.
 */
public record ApplicantSubmissionSummaryResponse(
        UUID submissionId,
        UUID auditionId,
        String auditionTitle,
        String performanceTitle,
        String companyName,
        String posterUrl,
        Instant submittedAt,
        List<SubmissionSelectedRoleResult> selectedRoles
) {

    public ApplicantSubmissionSummaryResponse {
        selectedRoles = List.copyOf(selectedRoles);
    }

    public static ApplicantSubmissionSummaryResponse from(SubmissionSummaryResult result, String posterUrl) {
        return new ApplicantSubmissionSummaryResponse(
                result.submissionId(),
                result.auditionId(),
                result.auditionTitle(),
                result.performanceTitle(),
                result.companyName(),
                posterUrl,
                result.submittedAt(),
                result.selectedRoles()
        );
    }
}
