package art.yesulin.company.domain.photo;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * 공연사 사진 형식·크기 기준. 화면이 휴대폰 사진을 긴 변 1600px JPEG로 줄여 올리므로 크기 상한은 넉넉하게 두고, 저장소에
 * 올라온 뒤에는 알린 형식과 실제 파일 앞부분(매직 바이트)이 맞는지 확인한다.
 */
public final class CompanyPhotoRules {

    public static final long MAX_BYTES = 10L * 1024 * 1024;
    /** 파일 앞부분 확인에 필요한 길이. WebP는 12바이트까지 본다. */
    public static final int SIGNATURE_LENGTH = 12;

    private static final Set<String> TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};
    private static final byte[] RIFF = "RIFF".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] WEBP = "WEBP".getBytes(StandardCharsets.US_ASCII);

    private CompanyPhotoRules() {
    }

    /** 받을 수 있는 형식이면 소문자로 정리한 형식을 준다. */
    public static Optional<String> contentType(String reported) {
        if (reported == null) {
            return Optional.empty();
        }
        int separator = reported.indexOf(';');
        String type = (separator < 0 ? reported : reported.substring(0, separator)).trim().toLowerCase(Locale.ROOT);
        return TYPES.contains(type) ? Optional.of(type) : Optional.empty();
    }

    /** 파일 앞부분이 알린 형식과 맞는지 본다. 확장자만 바꾼 파일이나 이미지가 아닌 파일을 거른다. */
    public static boolean matchesSignature(String contentType, byte[] head) {
        if (head == null) {
            return false;
        }
        return switch (contentType) {
            case "image/jpeg" -> startsWith(head, 0, JPEG);
            case "image/png" -> startsWith(head, 0, PNG);
            case "image/webp" -> startsWith(head, 0, RIFF) && startsWith(head, 8, WEBP);
            default -> false;
        };
    }

    private static boolean startsWith(byte[] value, int offset, byte[] prefix) {
        return value.length >= offset + prefix.length
                && Arrays.equals(value, offset, offset + prefix.length, prefix, 0, prefix.length);
    }
}
