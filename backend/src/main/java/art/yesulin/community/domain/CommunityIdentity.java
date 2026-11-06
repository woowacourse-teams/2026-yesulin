package art.yesulin.community.domain;

import art.yesulin.global.exception.BusinessException;
import java.security.SecureRandom;
import java.util.HexFormat;

public final class CommunityIdentity {

    private static final SecureRandom RANDOM = new SecureRandom();

    private CommunityIdentity() {
    }

    public static String issue(String current, String legacy) {
        validate(current);
        validate(legacy);
        ensureSameOwner(current, legacy);
        if (current != null) {
            return current;
        }
        if (legacy != null) {
            return legacy;
        }
        return generate();
    }

    public static boolean confirmed(String current, String legacy) {
        validate(current);
        validate(legacy);
        if (current == null) {
            return false;
        }
        return legacy == null || current.equals(legacy);
    }

    private static void ensureSameOwner(String current, String legacy) {
        if (current != null && legacy != null && !current.equals(legacy)) {
            throw new BusinessException(CommunityErrorCode.IDENTITY_CONFLICT,
                    "서로 다른 브라우저 관리 정보가 있어요. 기존 정보를 지우지 말고 문의해 주세요.");
        }
    }

    private static void validate(String value) {
        if (value != null) {
            CommunityDigest.owner(value);
        }
    }

    private static String generate() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
}
