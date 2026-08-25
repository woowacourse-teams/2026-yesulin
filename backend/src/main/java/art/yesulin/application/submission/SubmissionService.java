package art.yesulin.application.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.submission.SubmissionErrorCode.DUPLICATE_SUBMISSION;

import art.yesulin.application.submission.consent.SubmissionConsentDocumentMetadata;
import art.yesulin.application.submission.consent.SubmissionConsentDocumentProvider;
import art.yesulin.application.submission.form.SubmissionFormAnswerValidator;
import art.yesulin.application.submission.form.ValidatedSubmissionForm;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.ApplicantSnapshot;
import art.yesulin.domain.submission.AuditionSnapshot;
import art.yesulin.domain.submission.SelectedRoles;
import art.yesulin.domain.submission.Submission;
import art.yesulin.domain.submission.SubmissionRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SubmissionService {

    private static final String DUPLICATE_CONSTRAINT_NAME = "uk_submissions_applicant_audition";

    private final SubmissionRepository submissionRepository;
    private final SubmissionAuditionReader auditionReader;
    private final RecruitmentPeriodValidator recruitmentPeriodValidator;
    private final SelectedRoleValidator selectedRoleValidator;
    private final SubmissionFormAnswerValidator formAnswerValidator;
    private final SubmissionPhotoFileValidator photoFileValidator;
    private final SubmissionConsentDocumentProvider consentDocumentProvider;
    private final SubmissionConsentWriter consentWriter;
    private final SubmissionPhotoReferenceWriter photoReferenceWriter;
    private final SubmissionPosterReferenceWriter posterReferenceWriter;
    private final Clock clock;

    @Transactional
    public SubmittedSubmissionResult submit(long applicantId, UUID auditionId, SubmitSubmissionCommand command) {
        long validApplicantId = requirePositive(applicantId, "지원자 ID는 1 이상이어야 합니다.");
        UUID validAuditionId = requireNonNull(auditionId, "지원할 공고 ID는 필수입니다.");
        SubmitSubmissionCommand validCommand = requireNonNull(command, "제출할 지원서는 필수입니다.");
        Instant submittedAt = Instant.now(clock);

        SubmissionAudition audition = auditionReader.read(validAuditionId);
        ensureNotSubmitted(validApplicantId, audition.auditionId());
        recruitmentPeriodValidator.validate(audition, submittedAt);
        SelectedRoles selectedRoles = selectedRoleValidator.validateAndCreate(
                validCommand.selectedRoleIds(), audition
        );
        ValidatedSubmissionForm validatedForm = formAnswerValidator.validateAndCreate(
                validCommand, audition.form()
        );
        photoFileValidator.validate(validApplicantId, validatedForm.answers().photoRequirementAnswers());
        SubmissionConsentDocumentMetadata consentDocument = consentDocumentProvider.currentFor(
                audition.auditionId(), submittedAt
        );

        Submission submission = createSubmission(
                validApplicantId, submittedAt, audition, selectedRoles, validatedForm
        );
        Submission savedSubmission = saveSubmission(submission);
        consentWriter.save(savedSubmission, consentDocument, submittedAt);
        photoReferenceWriter.save(
                savedSubmission.getId(),
                savedSubmission.getFormAnswers().photoRequirementAnswers()
        );
        posterReferenceWriter.save(
                savedSubmission.getId(), savedSubmission.getAuditionSnapshot().posterFileId()
        );
        return SubmittedSubmissionResult.from(savedSubmission);
    }

    private void ensureNotSubmitted(long applicantId, long auditionId) {
        if (submissionRepository.existsByApplicantIdAndAuditionId(applicantId, auditionId)) {
            throw duplicateSubmission();
        }
    }

    private Submission createSubmission(
            long applicantId,
            Instant submittedAt,
            SubmissionAudition audition,
            SelectedRoles selectedRoles,
            ValidatedSubmissionForm form
    ) {
        ApplicantSnapshot applicantSnapshot = new ApplicantSnapshot(
                form.basicInformation(),
                form.additionalInformation(),
                form.fieldSnapshot(),
                submittedAt,
                audition.recruitmentEndAt()
        );
        return new Submission(
                applicantId,
                submittedAt,
                new AuditionSnapshot(
                        audition.auditionId(),
                        audition.publicAuditionId(),
                        audition.title(),
                        audition.performanceTitle(),
                        audition.companyName(),
                        audition.posterFileId(),
                        audition.posterOwnerId()
                ),
                applicantSnapshot,
                selectedRoles,
                form.answers()
        );
    }

    private Submission saveSubmission(Submission submission) {
        try {
            return submissionRepository.saveAndFlush(submission);
        } catch (DataIntegrityViolationException exception) {
            if (isDuplicateSubmission(exception)) {
                throw duplicateSubmission();
            }
            throw exception;
        }
    }

    private boolean isDuplicateSubmission(DataIntegrityViolationException exception) {
        Throwable cause = exception;
        while (cause != null) {
            if (cause instanceof ConstraintViolationException constraintViolation
                    && isDuplicateConstraint(constraintViolation.getConstraintName())) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }

    private boolean isDuplicateConstraint(String constraintName) {
        if (constraintName == null) {
            return false;
        }
        String normalizedName = constraintName
                .replace("`", "")
                .replace("\"", "")
                .toLowerCase(Locale.ROOT);
        for (String identifier : normalizedName.split("[\\s.]+")) {
            if (identifier.equals(DUPLICATE_CONSTRAINT_NAME)) {
                return true;
            }
        }
        return false;
    }

    private BusinessException duplicateSubmission() {
        return new BusinessException(DUPLICATE_SUBMISSION, "같은 공고에는 지원서를 한 번만 제출할 수 있습니다.");
    }
}
