package art.yesulin.feedback.domain;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * 의견 첨부 이미지 기준. 화면이 긴 변 1600px JPEG로 줄여 올리므로 한 장 5MB, 최대 3장이면 충분하다.
 * 알린 형식과 실제 파일 앞부분(매직 바이트)이 맞는지 확인해 확장자만 바꾼 파일을 거른다.
 */
public final class FeedbackImageRules {

    public static final int MAX_COUNT = 3;
    public static final long MAX_BYTES = 5L * 1024 * 1024;

    private static final Set<String> TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};
    private static final byte[] RIFF = "RIFF".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] WEBP = "WEBP".getBytes(StandardCharsets.US_ASCII);

    private FeedbackImageRules() {
    }

    /** 받을 수 있는 형식이면 소문자로 정리한 형식을 준다. */
    public static Optional<String> contentType(String reported) {
        if (reported == null) {
            return Optional.empty();
        }
        String type = reported.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
        if (!TYPES.contains(type)) {
            return Optional.empty();
        }
        return Optional.of(type);
    }

    public static boolean matchesSignature(String contentType, byte[] content) {
        return switch (contentType) {
            case "image/jpeg" -> startsWith(content, 0, JPEG);
            case "image/png" -> startsWith(content, 0, PNG);
            case "image/webp" -> startsWith(content, 0, RIFF) && startsWith(content, 8, WEBP);
            default -> false;
        };
    }

    private static boolean startsWith(byte[] value, int offset, byte[] prefix) {
        return value.length >= offset + prefix.length
                && Arrays.equals(value, offset, offset + prefix.length, prefix, 0, prefix.length);
    }
}
