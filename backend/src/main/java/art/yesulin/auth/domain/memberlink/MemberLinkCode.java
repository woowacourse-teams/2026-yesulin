package art.yesulin.auth.domain.memberlink;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 계정당 하나의 임시 코드. 원문은 저장하지 않으며 재발급·소비는 회원 행 잠금 안에서 수행한다. */
@Getter
@Entity
@Table(name = "member_link_codes")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberLinkCode {

    public static final Duration VALIDITY = Duration.ofMinutes(10);
    public static final Duration REISSUE_INTERVAL = Duration.ofSeconds(30);

    @Id
    @Column(name = "member_id", nullable = false, updatable = false)
    private Long memberId;

    @Column(name = "code_hash", nullable = false, unique = true, length = 64)
    private String codeHash;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    public MemberLinkCode(long memberId, String codeHash, Instant now) {
        this.memberId = memberId;
        replace(codeHash, now);
    }

    public void ensureReissuable(Instant now) {
        if (now.isBefore(issuedAt.plus(REISSUE_INTERVAL))) {
            throw new BusinessException(MemberLinkCodeErrorCode.COOLDOWN, "코드는 발급 후 30초가 지나면 다시 받을 수 있습니다.");
        }
    }

    public void reissue(String hash, Instant now) {
        ensureReissuable(now);
        replace(hash, now);
    }

    public void consume(String hash, Instant now) {
        if (!codeHash.equals(hash) || usedAt != null || !now.isBefore(expiresAt)) {
            throw invalid();
        }
        usedAt = now;
    }

    private void replace(String hash, Instant now) {
        codeHash = hash;
        issuedAt = now;
        expiresAt = now.plus(VALIDITY);
        usedAt = null;
    }

    public static String hash(String code) {
        if (code == null) {
            throw invalid();
        }
        String normalized = code.replace("-", "").replace(" ", "").toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-HJ-NP-Z2-9]{8}")) {
            throw invalid();
        }
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(normalized.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
        }
    }

    public static BusinessException invalid() {
        return new BusinessException(MemberLinkCodeErrorCode.INVALID,
                "코드가 올바르지 않거나 만료·사용되었습니다. 배우에게 새 코드를 받아 주세요.");
    }
}
