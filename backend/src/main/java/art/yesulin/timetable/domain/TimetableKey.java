package art.yesulin.timetable.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;
import java.util.regex.Pattern;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TimetableKey {

    public static final int LENGTH = 22;

    // 문자 링크가 짧으면서도 추측할 수 없는 128비트
    private static final int RANDOM_BYTES = 16;
    private static final Pattern FORMAT = Pattern.compile("[A-Za-z0-9_-]{" + LENGTH + "}");
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();

    @Column(nullable = false, updatable = false, length = LENGTH)
    private String value;

    public TimetableKey(String value) {
        if (!isWellFormed(value)) {
            throw new IllegalArgumentException("링크 열쇠 형식이 올바르지 않습니다.");
        }
        this.value = value;
    }

    public static TimetableKey generate() {
        byte[] bytes = new byte[RANDOM_BYTES];
        RANDOM.nextBytes(bytes);
        return new TimetableKey(ENCODER.encodeToString(bytes));
    }

    public static Optional<TimetableKey> parse(String value) {
        return isWellFormed(value) ? Optional.of(new TimetableKey(value)) : Optional.empty();
    }

    private static boolean isWellFormed(String value) {
        return value != null && FORMAT.matcher(value).matches();
    }
}
