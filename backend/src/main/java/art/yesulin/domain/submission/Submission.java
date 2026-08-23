package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;

import java.time.Instant;
import java.util.UUID;
import lombok.Getter;

@Getter
public class Submission {

    private final UUID submissionId;
    private final long applicantId;
    private final Instant submittedAt;
    private final AuditionSnapshot auditionSnapshot;
    private final ApplicantSnapshot applicantSnapshot;
    private final SelectedRoles selectedRoles;
    private final SubmissionFormResponses formResponses;

    public Submission(
            long applicantId,
            Instant submittedAt,
            AuditionSnapshot auditionSnapshot,
            ApplicantSnapshot applicantSnapshot,
            SelectedRoles selectedRoles,
            SubmissionFormResponses formResponses
    ) {
        this(
                UUID.randomUUID(), applicantId, submittedAt, auditionSnapshot,
                applicantSnapshot, selectedRoles, formResponses
        );
    }

    public Submission(
            UUID submissionId,
            long applicantId,
            Instant submittedAt,
            AuditionSnapshot auditionSnapshot,
            ApplicantSnapshot applicantSnapshot,
            SelectedRoles selectedRoles,
            SubmissionFormResponses formResponses
    ) {
        this.submissionId = requireNonNull(submissionId, "제출 지원서 ID는 필수입니다.");
        this.applicantId = requirePositive(applicantId, "지원자 ID는 1 이상이어야 합니다.");
        this.submittedAt = requireNonNull(submittedAt, "지원서 제출 시각은 필수입니다.");
        this.auditionSnapshot = requireNonNull(auditionSnapshot, "공고 스냅샷은 필수입니다.");
        this.applicantSnapshot = requireNonNull(applicantSnapshot, "지원자 스냅샷은 필수입니다.");
        this.selectedRoles = requireNonNull(selectedRoles, "선택 배역은 필수입니다.");
        this.formResponses = requireNonNull(formResponses, "지원 폼 응답은 필수입니다.");
    }

    public long getAuditionId() {
        return auditionSnapshot.auditionId();
    }
}
