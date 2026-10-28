package art.yesulin.pdfextraction.application;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

public record PdfExtractionResult(
        String status,
        String sourceSha256,
        String errorCode,
        List<String> warnings,
        List<Page> pages,
        @JsonInclude(JsonInclude.Include.NON_NULL) PdfApplicantInfo applicantInfo
) {

    /** 워커가 크기·비율로 사진일 가능성이 높다고 분류한 이미지. */
    public static final String CANDIDATE = "CANDIDATE";

    public PdfExtractionResult(String status, String sourceSha256, String errorCode, List<String> warnings,
                               List<Page> pages) {
        this(status, sourceSha256, errorCode, warnings, pages, null);
    }

    public PdfExtractionResult withImageUrls(Function<String, String> urlOf) {
        List<Page> signed = pages.stream().map(page -> new Page(page.number(), page.text(), page.needsOcr(),
                page.images().stream()
                        .map(image -> new Image(image.fileKey(), urlOf.apply(image.fileKey()), image.classification()))
                        .toList())).toList();
        return new PdfExtractionResult(status, sourceSha256, errorCode, warnings, signed, applicantInfo);
    }

    /** 배우 프로필 가져오기에서 제안할 값이 있는지. 사진 후보도 값으로 친다. */
    public boolean hasProfileProposal() {
        boolean photo = pages.stream()
                .flatMap(page -> page.images().stream())
                .anyMatch(image -> CANDIDATE.equals(image.classification()));
        return photo || (applicantInfo != null && applicantInfo.hasProposal());
    }

    public String extractedText() {
        return pages.stream().map(Page::text).collect(Collectors.joining("\n\n"));
    }

    public record Page(int number, String text, boolean needsOcr, List<Image> images) {
    }

    public record Image(String fileKey, String url, String classification) {
    }
}
