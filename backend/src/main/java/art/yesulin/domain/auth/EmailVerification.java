package art.yesulin.domain.auth;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import java.time.Instant;

public record EmailVerification(
        String token,
        long memberId,
        String email,
        Instant expiresAt
) {

    public EmailVerification {
        token = requireText(token, "이메일 인증 토큰이 필요합니다.");
        memberId = requirePositive(memberId, "회원 ID는 1 이상이어야 합니다.");
        email = requireText(email, "이메일이 필요합니다.");
        expiresAt = requireNonNull(expiresAt, "이메일 인증 만료 시각이 필요합니다.");
    }

    public boolean isExpiredAt(Instant now) {
        return !expiresAt.isAfter(requireNonNull(now, "현재 시각이 필요합니다."));
    }
}
