package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "submissions", uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_submissions_applicant_audition",
                columnNames = {"applicant_id", "audition_id"}
        ),
        @UniqueConstraint(name = "uk_submissions_public_id", columnNames = "public_id")
}, indexes = {
        @Index(name = "idx_submissions_applicant_submitted_at", columnList = "applicant_id, submitted_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "public_id", nullable = false, updatable = false, columnDefinition = "binary(16)")
    private UUID submissionId;

    @Column(name = "applicant_id", nullable = false, updatable = false)
    private long applicantId;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;

    @Embedded
    private AuditionSnapshot auditionSnapshot;

    @Embedded
    private ApplicantSnapshot applicantSnapshot;

    @Embedded
    private SelectedRoles selectedRoles;

    @Embedded
    private SubmissionFormResponses formResponses;

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
