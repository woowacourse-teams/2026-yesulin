package art.yesulin.pdfextraction.domain.ai;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "pdf_ai_jobs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PdfAiJob {

    @Id
    @Column(length = 36)
    private String jobId;
    @Column(updatable = false, length = 36)
    private String reviewId;
    @Column(nullable = false, updatable = false)
    private long ownerId;
    @Column(nullable = false, updatable = false, columnDefinition = "text")
    private String rolesJson;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PdfAiStatus status;
    @Column(nullable = false)
    private int attempts;
    @Column(nullable = false)
    private int retryGeneration;
    @Column(nullable = false)
    private Instant nextAttemptAt;
    private Instant leaseExpiresAt;
    @Column(length = 36)
    private String leaseToken;
    @Column(nullable = false, length = 20)
    private String provider;
    @Column(nullable = false, length = 150)
    private String modelId;
    @Column(nullable = false, length = 60)
    private String promptVersion;
    @Column(length = 60)
    private String errorCode;
    @Column(columnDefinition = "mediumtext")
    private String resultJson;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant updatedAt;

    public PdfAiJob(String jobId, String reviewId, long ownerId, String rolesJson, Instant now) {
        this.jobId = Objects.requireNonNull(jobId);
        this.reviewId = reviewId;
        this.ownerId = ownerId;
        this.rolesJson = Objects.requireNonNull(rolesJson);
        this.status = PdfAiStatus.PENDING;
        this.nextAttemptAt = now;
        this.createdAt = now;
        this.updatedAt = now;
        this.provider = "";
        this.modelId = "";
        this.promptVersion = "";
    }

    public void skip(String reason, Instant now) {
        require(status == PdfAiStatus.PENDING);
        this.status = PdfAiStatus.SKIPPED;
        this.errorCode = reason;
        this.updatedAt = now;
    }

    public String acquire(Instant now, Duration lease, String provider, String modelId, String promptVersion) {
        require(status == PdfAiStatus.PENDING && !nextAttemptAt.isAfter(now));
        this.status = PdfAiStatus.RUNNING;
        this.attempts++;
        this.leaseToken = UUID.randomUUID().toString();
        this.leaseExpiresAt = now.plus(lease);
        this.provider = provider;
        this.modelId = modelId;
        this.promptVersion = promptVersion;
        this.errorCode = null;
        this.updatedAt = now;
        return leaseToken;
    }

    public boolean ownsLease(String token, Instant now) {
        return status == PdfAiStatus.RUNNING && Objects.equals(leaseToken, token) && now.isBefore(leaseExpiresAt);
    }

    public void complete(String token, String result, Instant now) {
        require(ownsLease(token, now));
        this.status = PdfAiStatus.COMPLETED;
        this.resultJson = Objects.requireNonNull(result);
        this.errorCode = null;
        release(now);
    }

    public void fail(String token, String code, boolean retryable, int maxAttempts, Instant now) {
        require(ownsLease(token, now));
        retryOrFail(code, retryable, maxAttempts, now);
    }

    public void recoverExpired(int maxAttempts, Instant now) {
        require(status == PdfAiStatus.RUNNING && !leaseExpiresAt.isAfter(now));
        retryOrFail("LEASE_EXPIRED", true, maxAttempts, now);
    }

    public boolean requestRetry(int failedAttempts, long failedAt, int generation, Instant now) {
        if (status != PdfAiStatus.FAILED || attempts != failedAttempts || updatedAt.toEpochMilli() != failedAt
                || retryGeneration != generation) {
            return false;
        }
        this.status = PdfAiStatus.PENDING;
        this.attempts = 0;
        this.retryGeneration++;
        this.errorCode = null;
        this.resultJson = null;
        this.nextAttemptAt = now;
        release(now);
        return true;
    }

    private void retryOrFail(String code, boolean retryable, int maxAttempts, Instant now) {
        this.errorCode = code;
        this.status = retryable && attempts < maxAttempts ? PdfAiStatus.PENDING : PdfAiStatus.FAILED;
        this.nextAttemptAt = now.plusSeconds(Math.min(300, 15L << Math.min(5, attempts - 1)));
        release(now);
    }

    private void release(Instant now) {
        this.leaseToken = null;
        this.leaseExpiresAt = null;
        this.updatedAt = now;
    }

    private void require(boolean valid) {
        if (!valid) {
            throw new IllegalStateException("Invalid PDF AI job transition");
        }
    }
}
