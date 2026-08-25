package art.yesulin.presentation.api.submission;

import art.yesulin.application.submission.SubmissionSelectedRoleResult;
import art.yesulin.application.submission.SubmissionSummaryResult;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ApplicantSubmissionListResponse(List<SummaryResponse> submissions) {

    public ApplicantSubmissionListResponse {
        submissions = List.copyOf(submissions);
    }

    static ApplicantSubmissionListResponse from(
            List<SubmissionSummaryResult> results,
            Map<Long, String> posterUrlsByFileId
    ) {
        return new ApplicantSubmissionListResponse(results.stream()
                .map(result -> SummaryResponse.from(result, posterUrlsByFileId.get(result.posterFileId())))
                .toList());
    }

    public record SummaryResponse(
            UUID submissionId,
            UUID auditionId,
            String performanceTitle,
            String auditionTitle,
            String companyName,
            String posterUrl,
            Instant submittedAt,
            List<SubmissionSelectedRoleResult> selectedRoles
    ) {

        private static SummaryResponse from(SubmissionSummaryResult result, String posterUrl) {
            if (posterUrl == null) {
                throw new IllegalArgumentException("제출 포스터 파일에 대응하는 URL이 없습니다.");
            }
            return new SummaryResponse(
                    result.submissionId(),
                    result.auditionId(),
                    result.performanceTitle(),
                    result.auditionTitle(),
                    result.companyName(),
                    posterUrl,
                    result.submittedAt(),
                    result.selectedRoles()
            );
        }
    }
}
