package art.yesulin.domain.timetable;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.regex.Pattern;

/**
 * 로그인 대신 쓰는 링크 열쇠다. 기획사 관리 링크와 배우 개인 링크가 각각 하나씩 갖는다.
 * 문자에 넣는 링크가 짧도록 추측할 수 없는 최소 크기인 16바이트(128비트) 난수를 URL에 그대로 넣을 수 있는
 * Base64 문자 22자로 만든다.
 */
public final class TimetableKey {

    public static final int LENGTH = 22;

    private static final int RANDOM_BYTES = 16;
    private static final Pattern FORMAT = Pattern.compile("[A-Za-z0-9_-]{" + LENGTH + "}");
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();

    private TimetableKey() {
    }

    public static String generate() {
        byte[] bytes = new byte[RANDOM_BYTES];
        RANDOM.nextBytes(bytes);
        return ENCODER.encodeToString(bytes);
    }

    /** 형식이 틀린 열쇠는 DB를 조회하지 않고 찾을 수 없는 것으로 다룬다. */
    public static boolean isWellFormed(String key) {
        return key != null && FORMAT.matcher(key).matches();
    }
}
