package art.yesulin.domain.application;

import art.yesulin.domain.applicant.ApplicantId;
import art.yesulin.domain.common.DomainError;
import art.yesulin.domain.common.DomainException;
import art.yesulin.domain.recruitment.RoleId;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public final class Application {

    private final ApplicationId id;
    private final ApplicantId applicantId;
    private final Submission submission;

    private Application(ApplicationId id, ApplicantId applicantId, Submission submission) {
        this.id = id;
        this.applicantId = applicantId;
        this.submission = submission;
    }

    public static Application submit(
            ApplicationId id, ApplicantId authenticatedApplicantId, Submission submission) {
        validateBasicInformation(submission.basicInformation());
        validateRoles(submission);
        validateConsents(submission.consentEvidence());
        return new Application(id, authenticatedApplicantId, submission);
    }

    public static Application submit(ApplicantId authenticatedApplicantId, Submission submission) {
        validateBasicInformation(submission.basicInformation());
        validateRoles(submission);
        validateConsents(submission.consentEvidence());
        return new Application(null, authenticatedApplicantId, submission);
    }

    private static void validateBasicInformation(BasicInformation information) {
        if (isBlank(information.name())
                || information.height() <= 0
                || information.weight() <= 0
                || information.birthDate() == null
                || information.gender() == null
                || isBlank(information.phone())
                || isBlank(information.email())
                || isBlank(information.residence())) {
            throw new DomainException(DomainError.APPLICATION_REQUIRED_INFORMATION_MISSING);
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static void validateRoles(Submission submission) {
        if (submission.roles().isEmpty()) {
            throw new DomainException(DomainError.APPLICATION_ROLE_REQUIRED);
        }
        if (!submission.allowsMultipleRoles() && submission.roles().size() > 1) {
            throw new DomainException(DomainError.APPLICATION_MULTIPLE_ROLES_NOT_ALLOWED);
        }
        Set<RoleId> uniqueRoleIds = new HashSet<>();
        for (SelectedRole role : submission.roles()) {
            if (!role.postingId().equals(submission.postingId())) {
                throw new DomainException(DomainError.APPLICATION_ROLE_INVALID);
            }
            if (!uniqueRoleIds.add(role.roleId())) {
                throw new DomainException(DomainError.APPLICATION_ROLE_DUPLICATED);
            }
        }
    }

    private static void validateConsents(ConsentEvidence evidence) {
        if (!evidence.collectionAndUse() || !evidence.thirdPartyProvision()) {
            throw new DomainException(DomainError.APPLICATION_CONSENT_REQUIRED);
        }
    }

    public Optional<ApplicationId> id() {
        return Optional.ofNullable(id);
    }

    public ApplicantId applicantId() {
        return applicantId;
    }

    public List<SelectedRole> roles() {
        return submission.roles();
    }

    public Instant submittedAt() {
        return submission.submittedAt();
    }

    public SnapshotDocument snapshot() {
        return submission.snapshot();
    }

    public Submission submission() {
        return submission;
    }
}
