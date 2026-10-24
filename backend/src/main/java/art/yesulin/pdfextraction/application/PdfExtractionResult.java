package art.yesulin.pdfextraction.application;

import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

public record PdfExtractionResult(
        String status,
        String sourceSha256,
        String errorCode,
        List<String> warnings,
        List<Page> pages
) {

    public PdfExtractionResult withImageUrls(Function<String, String> urlOf) {
        List<Page> signed = pages.stream().map(page -> new Page(page.number(), page.text(), page.needsOcr(),
                page.images().stream()
                        .map(image -> new Image(image.fileKey(), urlOf.apply(image.fileKey()), image.classification()))
                        .toList())).toList();
        return new PdfExtractionResult(status, sourceSha256, errorCode, warnings, signed);
    }

    public String extractedText() {
        return pages.stream().map(Page::text).collect(Collectors.joining("\n\n"));
    }

    public record Page(int number, String text, boolean needsOcr, List<Image> images) {
    }

    public record Image(String fileKey, String url, String classification) {
    }
}
