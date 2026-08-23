package art.yesulin.presentation.api.submission;

import art.yesulin.application.submission.SubmissionDetailResult;
import art.yesulin.application.submission.SubmissionSelectedRoleResult;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

public record ApplicantSubmissionDetailResponse(
        UUID submissionId,
        String auditionTitle,
        Instant submittedAt,
        SubmissionDetailResult.ApplicantSnapshotResult applicant,
        List<SubmissionSelectedRoleResult> selectedRoles,
        FormAnswersResponse formAnswers,
        List<SubmissionDetailResult.ConsentResult> consents
) {

    static ApplicantSubmissionDetailResponse from(
            SubmissionDetailResult result,
            List<String> photoUrls
    ) {
        return new ApplicantSubmissionDetailResponse(
                result.submissionId(),
                result.auditionTitle(),
                result.submittedAt(),
                result.applicant(),
                result.selectedRoles(),
                FormAnswersResponse.from(result.formAnswers(), photoUrls),
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
                List<String> photoUrls
        ) {
            if (answers.photoRequirementAnswers().size() != photoUrls.size()) {
                throw new IllegalArgumentException("제출 사진 답변과 URL 개수가 일치하지 않습니다.");
            }
            return new FormAnswersResponse(
                    answers.questionAnswers(),
                    toPhotoRequirementAnswers(answers.photoRequirementAnswers(), photoUrls),
                    answers.videoRequirementAnswers()
            );
        }

        private static List<PhotoRequirementAnswerResponse> toPhotoRequirementAnswers(
                List<SubmissionDetailResult.PhotoRequirementAnswerResult> answers,
                List<String> photoUrls
        ) {
            return IntStream.range(0, answers.size())
                    .mapToObj(index -> PhotoRequirementAnswerResponse.from(answers.get(index), photoUrls.get(index)))
                    .toList();
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
