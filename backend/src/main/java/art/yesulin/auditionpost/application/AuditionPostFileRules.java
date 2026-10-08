package art.yesulin.auditionpost.application;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * 원문 파일을 옮길 때의 형식·크기 기준. 사진은 화면에 바로 보이므로 이미지 형식만 받고, 첨부파일은 오디션 공고에서
 * 쓰는 문서·악보·음원 형식만 받는다. 첨부는 항상 내려받기로 응답해 브라우저가 열어 실행하지 않게 한다.
 */
public final class AuditionPostFileRules {

    public static final long MAX_IMAGE_BYTES = 20L * 1024 * 1024;
    public static final long MAX_ATTACHMENT_BYTES = 50L * 1024 * 1024;

    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/gif", "image/webp");
    private static final Map<String, String> IMAGE_EXTENSIONS = Map.of(
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "png", "image/png",
            "gif", "image/gif",
            "webp", "image/webp"
    );
    private static final Map<String, String> ATTACHMENT_TYPES = Map.ofEntries(
            Map.entry("pdf", "application/pdf"),
            Map.entry("doc", "application/msword"),
            Map.entry("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            Map.entry("hwp", "application/x-hwp"),
            Map.entry("hwpx", "application/hwp+zip"),
            Map.entry("xls", "application/vnd.ms-excel"),
            Map.entry("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            Map.entry("ppt", "application/vnd.ms-powerpoint"),
            Map.entry("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            Map.entry("txt", "text/plain"),
            Map.entry("zip", "application/zip"),
            Map.entry("jpg", "image/jpeg"),
            Map.entry("jpeg", "image/jpeg"),
            Map.entry("png", "image/png"),
            Map.entry("mp3", "audio/mpeg"),
            Map.entry("m4a", "audio/mp4"),
            Map.entry("wav", "audio/wav")
    );

    private AuditionPostFileRules() {
    }

    /** 서버가 알려 준 형식을 먼저 보고, 일반 바이너리로만 알려 주면 확장자로 판단한다. */
    public static Optional<String> imageContentType(String reportedType, String filename) {
        String normalized = normalizeType(reportedType);
        if (IMAGE_TYPES.contains(normalized)) {
            return Optional.of(normalized);
        }
        return Optional.ofNullable(IMAGE_EXTENSIONS.get(extensionOf(filename)));
    }

    public static Optional<String> attachmentContentType(String filename) {
        return Optional.ofNullable(ATTACHMENT_TYPES.get(extensionOf(filename)));
    }

    /** RFC 6266 형식. 한글 이름은 {@code filename*}로, 구형 브라우저용 이름은 ASCII 대체 이름으로 보낸다. */
    public static String attachmentDisposition(String filename) {
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        String extension = extensionOf(filename);
        String fallback = extension.isEmpty() ? "attachment" : "attachment." + extension;
        return "attachment; filename=\"%s\"; filename*=UTF-8''%s".formatted(fallback, encoded);
    }

    static String extensionOf(String filename) {
        if (filename == null) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            return "";
        }
        return filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private static String normalizeType(String type) {
        if (type == null) {
            return "";
        }
        int separator = type.indexOf(';');
        String base = separator < 0 ? type : type.substring(0, separator);
        return base.trim().toLowerCase(Locale.ROOT);
    }
}
