package art.yesulin.pdfextraction.application;

import java.util.List;

public record PdfExtractionResult(
        String status,
        String sourceSha256,
        String errorCode,
        List<String> warnings,
        List<Page> pages
) {

    public record Page(int number, String text, boolean needsOcr, List<Image> images) {
    }

    public record Image(String fileKey, String url, String classification) {
    }
}
