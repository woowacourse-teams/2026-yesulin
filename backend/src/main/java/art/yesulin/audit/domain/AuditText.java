package art.yesulin.audit.domain;

import static art.yesulin.audit.domain.AuditErrorCode.INVALID_PDF_REVIEW;

import art.yesulin.global.exception.BusinessException;
import java.text.Normalizer;
import java.util.Objects;
import java.util.regex.Pattern;

public final class AuditText {

    private static final Pattern INVISIBLE = Pattern.compile("[\\u200B\\uFEFF]");
    private static final Pattern SPACES = Pattern.compile("[\\p{Z}\\s]+");

    private AuditText() {
    }

    public static String normalize(String value) {
        String nfc = Normalizer.normalize(Objects.requireNonNullElse(value, ""), Normalizer.Form.NFC);
        return SPACES.matcher(INVISIBLE.matcher(nfc).replaceAll("")).replaceAll(" ").strip();
    }

    public static String requireName(String value, int maxLength, String fieldName) {
        String normalized = normalize(value);
        boolean invalid = normalized.isEmpty()
                || length(normalized) > maxLength
                || normalized.chars().anyMatch(Character::isISOControl);
        if (invalid) {
            throw new BusinessException(INVALID_PDF_REVIEW,
                    "%s은(는) 1자 이상 %d자 이하로 입력해 주세요.", fieldName, maxLength);
        }
        return normalized;
    }

    public static int length(String value) {
        return value.codePointCount(0, value.length());
    }

    public static String abbreviate(String value, int maxLength) {
        if (length(value) <= maxLength) {
            return value;
        }
        return value.substring(0, value.offsetByCodePoints(0, maxLength - 1)) + "…";
    }
}
