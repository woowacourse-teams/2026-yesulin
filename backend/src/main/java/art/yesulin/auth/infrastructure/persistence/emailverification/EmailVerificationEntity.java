package art.yesulin.auth.infrastructure.persistence.emailverification;

import art.yesulin.auth.domain.EmailVerification;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "email_verifications")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class EmailVerificationEntity {

    @Id
    @Column(name = "token", length = 64, nullable = false, updatable = false)
    private String token;

    @Column(name = "member_id", nullable = false, unique = true, updatable = false)
    private Long memberId;

    @Column(name = "email", length = 320, nullable = false, updatable = false)
    private String email;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    @Column(name = "code_hash", length = 100)
    private String codeHash;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts;

    @Column(name = "issued_at", updatable = false)
    private Instant issuedAt;

    private EmailVerificationEntity(EmailVerification verification) {
        this.token = verification.token();
        this.memberId = verification.memberId();
        this.email = verification.email();
        this.expiresAt = verification.expiresAt();
        this.codeHash = verification.codeHash();
        this.failedAttempts = verification.failedAttempts();
        this.issuedAt = verification.issuedAt();
    }

    static EmailVerificationEntity from(EmailVerification verification) {
        return new EmailVerificationEntity(verification);
    }

    EmailVerification toDomain() {
        return new EmailVerification(token, memberId, email, expiresAt, codeHash, failedAttempts, issuedAt);
    }

    void recordFailure() {
        failedAttempts += 1;
    }
}
