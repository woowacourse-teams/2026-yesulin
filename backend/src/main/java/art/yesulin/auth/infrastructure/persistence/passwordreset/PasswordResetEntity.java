package art.yesulin.auth.infrastructure.persistence.passwordreset;

import art.yesulin.auth.domain.PasswordReset;
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
@Table(name = "password_resets")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class PasswordResetEntity {

    @Id
    @Column(name = "token", length = 64, nullable = false, updatable = false)
    private String token;

    @Column(name = "member_id", nullable = false, unique = true, updatable = false)
    private Long memberId;

    @Column(name = "email", length = 320, nullable = false, updatable = false)
    private String email;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    private PasswordResetEntity(String token, long memberId, String email, Instant expiresAt) {
        this.token = token;
        this.memberId = memberId;
        this.email = email;
        this.expiresAt = expiresAt;
    }

    static PasswordResetEntity from(PasswordReset passwordReset) {
        return new PasswordResetEntity(
                passwordReset.token(),
                passwordReset.memberId(),
                passwordReset.email(),
                passwordReset.expiresAt()
        );
    }

    PasswordReset toDomain() {
        return new PasswordReset(token, memberId, email, expiresAt);
    }
}
