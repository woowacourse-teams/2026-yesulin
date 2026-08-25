package art.yesulin.presentation.api.submission;

import art.yesulin.application.submission.SubmissionDetailResult;
import art.yesulin.application.submission.SubmissionSelectedRoleResult;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ApplicantSubmissionDetailResponse(
        UUID submissionId,
        UUID auditionId,
        String auditionTitle,
        String performanceTitle,
        String companyName,
        String posterUrl,
        Instant submittedAt,
        SubmissionDetailResult.ApplicantSnapshotResult applicant,
        List<SubmissionSelectedRoleResult> selectedRoles,
        FormAnswersResponse formAnswers,
        List<SubmissionDetailResult.ConsentResult> consents
) {

    static ApplicantSubmissionDetailResponse from(
            SubmissionDetailResult result,
            String posterUrl,
            Map<Long, String> photoUrlsByFileId
    ) {
        return new ApplicantSubmissionDetailResponse(
                result.submissionId(),
                result.auditionId(),
                result.auditionTitle(),
                result.performanceTitle(),
                result.companyName(),
                posterUrl,
                result.submittedAt(),
                result.applicant(),
                result.selectedRoles(),
                FormAnswersResponse.from(result.formAnswers(), photoUrlsByFileId),
                result.consents()
        );
    }

    public record FormAnswersResponse(
            List<SubmissionDetailResult.QuestionAnswerResult> questionAnswers,
            List<PhotoRequirementAnswerResponse> photoRequirementAnswers,
            List<SubmissionDetailResult.VideoRequirementAnswerResult> videoRequirementAnswers
    ) {

        private static FormAnswersResponse from(
                SubmissionDetailResult.FormAnswersResult answers,
                Map<Long, String> photoUrlsByFileId
        ) {
            return new FormAnswersResponse(
                    answers.questionAnswers(),
                    toPhotoRequirementAnswers(answers.photoRequirementAnswers(), photoUrlsByFileId),
                    answers.videoRequirementAnswers()
            );
        }

        private static List<PhotoRequirementAnswerResponse> toPhotoRequirementAnswers(
                List<SubmissionDetailResult.PhotoRequirementAnswerResult> answers,
                Map<Long, String> photoUrlsByFileId
        ) {
            return answers.stream()
                    .map(answer -> PhotoRequirementAnswerResponse.from(
                            answer, findPhotoUrl(photoUrlsByFileId, answer.fileId())
                    ))
                    .toList();
        }

        private static String findPhotoUrl(Map<Long, String> photoUrlsByFileId, long fileId) {
            String photoUrl = photoUrlsByFileId.get(fileId);
            if (photoUrl == null) {
                throw new IllegalArgumentException("제출 사진 파일에 대응하는 URL이 없습니다.");
            }
            return photoUrl;
        }
    }

    public record PhotoRequirementAnswerResponse(
            long photoRequirementId,
            String requirementDescription,
            long fileId,
            String url
    ) {

        private static PhotoRequirementAnswerResponse from(
                SubmissionDetailResult.PhotoRequirementAnswerResult answer,
                String url
        ) {
            return new PhotoRequirementAnswerResponse(
                    answer.photoRequirementId(),
                    answer.requirementDescription(),
                    answer.fileId(),
                    url
            );
        }
    }
}
