package art.yesulin.application.submission;

import art.yesulin.domain.submission.ApplicantSnapshot;
import art.yesulin.domain.submission.AuditionSnapshot;
import art.yesulin.domain.submission.MilitaryServiceStatus;
import art.yesulin.domain.submission.PhotoRequirementAnswer;
import art.yesulin.domain.submission.QuestionAnswer;
import art.yesulin.domain.submission.Submission;
import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionAdditionalInformationField;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionBasicInformationField;
import art.yesulin.domain.submission.SubmissionCareer;
import art.yesulin.domain.submission.SubmissionConsent;
import art.yesulin.domain.submission.SubmissionConsentType;
import art.yesulin.domain.submission.SubmissionEducationLevel;
import art.yesulin.domain.submission.SubmissionFieldSnapshot;
import art.yesulin.domain.submission.SubmissionFormAnswers;
import art.yesulin.domain.submission.SubmissionGender;
import art.yesulin.domain.submission.VideoRequirementAnswer;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public record SubmissionDetailResult(
        UUID submissionId,
        UUID auditionId,
        String performanceTitle,
        String auditionTitle,
        String companyName,
        long posterFileId,
        long posterOwnerId,
        Instant submittedAt,
        ApplicantSnapshotResult applicant,
        List<SubmissionSelectedRoleResult> selectedRoles,
        FormAnswersResult formAnswers,
        List<ConsentResult> consents
) {

    public SubmissionDetailResult {
        selectedRoles = List.copyOf(selectedRoles);
        consents = List.copyOf(consents);
    }

    public static SubmissionDetailResult from(Submission submission, List<SubmissionConsent> consents) {
        AuditionSnapshot audition = submission.getAuditionSnapshot();
        return new SubmissionDetailResult(
                submission.getSubmissionId(),
                audition.publicAuditionId(),
                audition.performanceTitle(),
                audition.title(),
                audition.companyName(),
                audition.posterFileId(),
                audition.posterOwnerId(),
                submission.getSubmittedAt(),
                ApplicantSnapshotResult.from(submission.getApplicantSnapshot()),
                submission.getSelectedRoles().values().stream().map(SubmissionSelectedRoleResult::from).toList(),
                FormAnswersResult.from(submission.getFormAnswers()),
                consents.stream()
                        .sorted(Comparator.comparing(SubmissionConsent::getConsentType))
                        .map(ConsentResult::from)
                        .toList()
        );
    }

    public record ApplicantSnapshotResult(
            BasicInformationResult basicInformation,
            AdditionalInformationResult additionalInformation,
            FieldSnapshotResult fieldSnapshot,
            Integer ageAtRecruitmentDeadline
    ) {

        private static ApplicantSnapshotResult from(ApplicantSnapshot snapshot) {
            return new ApplicantSnapshotResult(
                    BasicInformationResult.from(snapshot.getBasicInformation()),
                    AdditionalInformationResult.from(snapshot.getAdditionalInformation()),
                    FieldSnapshotResult.from(snapshot.getSubmissionFieldSnapshot()),
                    snapshot.getAgeAtRecruitmentDeadline()
            );
        }
    }

    public record BasicInformationResult(
            String name,
            Integer height,
            Integer weight,
            LocalDate birthDate,
            SubmissionGender gender,
            String phone,
            String email,
            String address
    ) {

        private static BasicInformationResult from(SubmissionBasicInformation information) {
            return new BasicInformationResult(
                    information.name(),
                    information.height(),
                    information.weight(),
                    information.birthDate(),
                    information.gender(),
                    information.phone(),
                    information.email(),
                    information.address()
            );
        }
    }

    public record AdditionalInformationResult(
            SubmissionEducationLevel educationLevel,
            String school,
            String major,
            List<String> links,
            String nationality,
            String coverLetter,
            String specialty,
            String hobbies,
            MilitaryServiceStatus militaryServiceStatus,
            List<CareerResult> careers
    ) {

        public AdditionalInformationResult(
                String school,
                List<String> links,
                String nationality,
                String coverLetter,
                String specialty,
                String hobbies,
                MilitaryServiceStatus militaryServiceStatus,
                List<CareerResult> careers
        ) {
            this(
                    null, school, null, links, nationality, coverLetter, 
                    specialty, hobbies, militaryServiceStatus, careers
            );
        }

        private static AdditionalInformationResult from(SubmissionAdditionalInformation information) {
            return new AdditionalInformationResult(
                    information.educationLevel(),
                    information.school(),
                    information.major(),
                    information.links(),
                    information.nationality(),
                    information.coverLetter(),
                    information.specialty(),
                    information.hobbies(),
                    information.military(),
                    information.careers().stream().map(CareerResult::from).toList()
            );
        }
    }

    public record CareerResult(int year, String title, String roleName) {

        private static CareerResult from(SubmissionCareer career) {
            return new CareerResult(career.year(), career.title(), career.roleName());
        }
    }

    public record FieldSnapshotResult(
            List<SubmissionBasicInformationField> basicFields,
            List<SubmissionAdditionalInformationField> additionalFields
    ) {

        private static FieldSnapshotResult from(SubmissionFieldSnapshot fields) {
            return new FieldSnapshotResult(fields.basicFields(), fields.additionalFields());
        }
    }

    public record FormAnswersResult(
            List<QuestionAnswerResult> questionAnswers,
            List<PhotoRequirementAnswerResult> photoRequirementAnswers,
            List<VideoRequirementAnswerResult> videoRequirementAnswers
    ) {

        private static FormAnswersResult from(SubmissionFormAnswers answers) {
            return new FormAnswersResult(
                    answers.questionAnswers().values().stream().map(QuestionAnswerResult::from).toList(),
                    answers.photoRequirementAnswers().values().stream()
                            .map(PhotoRequirementAnswerResult::from)
                            .toList(),
                    answers.videoRequirementAnswers().values().stream()
                            .map(VideoRequirementAnswerResult::from)
                            .toList()
            );
        }
    }

    public record QuestionAnswerResult(long questionId, String question, String answer) {

        private static QuestionAnswerResult from(QuestionAnswer answer) {
            return new QuestionAnswerResult(answer.questionId(), answer.question(), answer.answer());
        }
    }

    public record PhotoRequirementAnswerResult(
            long photoRequirementId,
            String requirementDescription,
            long fileId
    ) {

        private static PhotoRequirementAnswerResult from(PhotoRequirementAnswer answer) {
            return new PhotoRequirementAnswerResult(
                    answer.photoRequirementId(), answer.requirementDescription(), answer.fileId()
            );
        }
    }

    public record VideoRequirementAnswerResult(
            long videoRequirementId,
            String requirementDescription,
            String url
    ) {

        private static VideoRequirementAnswerResult from(VideoRequirementAnswer answer) {
            return new VideoRequirementAnswerResult(
                    answer.videoRequirementId(), answer.requirementDescription(), answer.url()
            );
        }
    }

    public record ConsentResult(
            SubmissionConsentType type,
            String documentVersion,
            String recipientName,
            Instant agreedAt
    ) {

        private static ConsentResult from(SubmissionConsent consent) {
            return new ConsentResult(
                    consent.getConsentType(),
                    consent.getDocumentVersion(),
                    consent.getRecipientNameSnapshot(),
                    consent.getAgreedAt()
            );
        }
    }
}
