package art.yesulin.community.domain;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public final class CommunityDigest {

    private CommunityDigest() {
    }

    public static String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
        }
    }

    public static String owner(String secret) {
        if (secret == null || !secret.matches("[a-f0-9]{64}")) {
            throw new IllegalArgumentException("작성한 브라우저 정보를 확인할 수 없어요.");
        }
        return hash(secret);
    }

    public static String viewer(String secret) {
        if (secret == null || secret.isBlank()) {
            return "";
        }
        return owner(secret);
    }
}
