package art.yesulin.community.domain;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "community_reports")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CommunityReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private long entryId;

    @Column(nullable = false, updatable = false)
    private long postId;

    @Column(nullable = false, length = 64, updatable = false)
    private String reporterHash;

    @Column(nullable = false, length = 36, unique = true, updatable = false)
    private String requestKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30, updatable = false)
    private ReportReason reason;

    @Column(nullable = false, length = 1000, updatable = false)
    private String detail;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private boolean notification;

    private Instant deliveredAt;

    private Instant nextAttemptAt;

    @Column(nullable = false)
    private int attempts;

    public CommunityReport(long entryId, long postId, String owner, UUID requestId,
                           ReportReason reason, String detail, Instant now) {
        this.entryId = entryId;
        this.postId = postId;
        this.reporterHash = Objects.requireNonNull(owner);
        this.requestKey = Objects.requireNonNull(requestId).toString();
        this.reason = Objects.requireNonNull(reason);
        this.detail = CommunityText.optional(detail, 1000);
        this.createdAt = now;
    }

    public void queueNotification(boolean first) {
        notification = first;
        if (first) {
            nextAttemptAt = createdAt;
        }
    }

    public void verifyRetry(long entry, String owner, ReportReason reason, String detail) {
        if (entryId != entry || !reporterHash.equals(owner) || this.reason != reason
                || !this.detail.equals(CommunityText.optional(detail, 1000))) {
            throw new BusinessException(CommunityErrorCode.REQUEST_CONFLICT, "이미 사용한 신고 요청 번호예요.");
        }
    }

    public boolean isDue(Instant now) {
        return notification && deliveredAt == null && nextAttemptAt != null && !nextAttemptAt.isAfter(now);
    }

    public void delivered(Instant now) {
        attempts++;
        deliveredAt = now;
        nextAttemptAt = null;
    }

    public void retryLater(Instant now) {
        attempts++;
        nextAttemptAt = now.plusSeconds(Math.min(3600, 30L * attempts));
    }
}
