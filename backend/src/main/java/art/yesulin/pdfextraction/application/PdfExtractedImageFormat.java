package art.yesulin.pdfextraction.application;

import java.util.Arrays;
import java.util.Optional;

/** Lambda가 저장한 추출 이미지 형식. 이전 결과의 PNG와 현재 결과의 WebP를 함께 읽는다. */
public enum PdfExtractedImageFormat {
    PNG("png", "image/png"),
    WEBP("webp", "image/webp");

    private static final String SAFE_FILENAME = "[a-zA-Z0-9_-]+\\.[a-z]+";

    private final String extension;
    private final String contentType;

    PdfExtractedImageFormat(String extension, String contentType) {
        this.extension = extension;
        this.contentType = contentType;
    }

    public static Optional<PdfExtractedImageFormat> fromFilename(String filename) {
        return Arrays.stream(values())
                .filter(format -> filename.endsWith("." + format.extension))
                .findFirst();
    }

    public static boolean isStoredImageName(String filename) {
        return filename.matches(SAFE_FILENAME) && fromFilename(filename).isPresent();
    }

    public String filename(String baseName) {
        return baseName + "." + extension;
    }

    public String contentType() {
        return contentType;
    }
}
