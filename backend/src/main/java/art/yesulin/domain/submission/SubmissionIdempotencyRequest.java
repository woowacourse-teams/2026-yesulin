package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
@Table(name = "submission_idempotency_requests", uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_submission_idempotency_applicant_key",
                columnNames = {"applicant_id", "idempotency_key"}
        )
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SubmissionIdempotencyRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "applicant_id", nullable = false, updatable = false)
    private long applicantId;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "idempotency_key", nullable = false, updatable = false, columnDefinition = "binary(16)")
    private UUID idempotencyKey;

    @Column(name = "request_hash", nullable = false, updatable = false, columnDefinition = "char(64)")
    private String requestHash;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "submission_id", columnDefinition = "binary(16)")
    private UUID submissionId;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public SubmissionIdempotencyRequest(
            long applicantId,
            UUID idempotencyKey,
            String requestHash,
            Instant createdAt
    ) {
        this.applicantId = requirePositive(applicantId, "지원자 ID는 1 이상이어야 합니다.");
        this.idempotencyKey = requireNonNull(idempotencyKey, "멱등 키는 필수입니다.");
        this.requestHash = requireNonNull(requestHash, "요청 hash는 필수입니다.");
        this.createdAt = requireNonNull(createdAt, "멱등 요청 생성 시각은 필수입니다.");
    }

    public boolean hasSameRequestHash(String candidate) {
        return requestHash.equals(candidate);
    }

    public void complete(UUID resultSubmissionId, Instant resultSubmittedAt) {
        submissionId = requireNonNull(resultSubmissionId, "제출 지원서 ID는 필수입니다.");
        submittedAt = requireNonNull(resultSubmittedAt, "지원서 제출 시각은 필수입니다.");
    }
}
