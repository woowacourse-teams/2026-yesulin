package art.yesulin.auth.domain;

import static art.yesulin.global.validation.DomainValidator.requireNonNull;
import static art.yesulin.global.validation.DomainValidator.requirePositive;
import static art.yesulin.global.validation.DomainValidator.requireText;

import java.time.Duration;
import java.time.Instant;

public record EmailVerification(
        String token,
        long memberId,
        String email,
        Instant expiresAt,
        String codeHash,
        int failedAttempts,
        Instant issuedAt
) {

    private static final int MAX_ATTEMPTS = 5;
    private static final Duration RESEND_INTERVAL = Duration.ofMinutes(1);

    public EmailVerification(String token, long memberId, String email, Instant expiresAt) {
        this(token, memberId, email, expiresAt, null, 0, null);
    }

    public EmailVerification {
        token = requireText(token, "이메일 인증 토큰이 필요합니다.");
        memberId = requirePositive(memberId, "회원 ID는 1 이상이어야 합니다.");
        email = requireText(email, "이메일이 필요합니다.");
        expiresAt = requireNonNull(expiresAt, "이메일 인증 만료 시각이 필요합니다.");
    }

    public boolean isExpiredAt(Instant now) {
        return !expiresAt.isAfter(requireNonNull(now, "현재 시각이 필요합니다."));
    }

    public static EmailVerification forCode(
            String token, long memberId, String email, String codeHash, Instant now, Duration expiration
    ) {
        String hash = requireText(codeHash, "인증번호 해시가 필요합니다.");
        return new EmailVerification(token, memberId, email, now.plus(expiration), hash, 0, now);
    }

    public boolean hasCode() {
        return codeHash != null;
    }

    public boolean isAttemptLimitReached() {
        return failedAttempts >= MAX_ATTEMPTS;
    }

    public boolean canResendAt(Instant now) {
        if (issuedAt == null) {
            return true;
        }
        return !issuedAt.plus(RESEND_INTERVAL).isAfter(now);
    }

    public EmailVerification withFailedAttempts(int attempts) {
        return new EmailVerification(token, memberId, email, expiresAt, codeHash, attempts, issuedAt);
    }
}
