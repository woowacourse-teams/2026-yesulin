package art.yesulin.infrastructure.persistence.emailverification;

import art.yesulin.domain.auth.EmailVerification;
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

    private EmailVerificationEntity(String token, long memberId, String email, Instant expiresAt) {
        this.token = token;
        this.memberId = memberId;
        this.email = email;
        this.expiresAt = expiresAt;
    }

    static EmailVerificationEntity from(EmailVerification verification) {
        return new EmailVerificationEntity(
                verification.token(),
                verification.memberId(),
                verification.email(),
                verification.expiresAt()
        );
    }

    EmailVerification toDomain() {
        return new EmailVerification(token, memberId, email, expiresAt);
    }
}
