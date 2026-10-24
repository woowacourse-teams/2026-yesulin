package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.INVALID_PDF_EXTRACTION_RESULT;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfExtractionResultParser {

    public static final String PIPELINE_VERSION = "pdfium-v1";
    public static final int MAX_RESULT_BYTES = 2 * 1024 * 1024;
    public static final int MAX_PAGES = 50;
    public static final int MAX_IMAGES = 100;
    public static final int MAX_TEXT_CHARS = MAX_RESULT_BYTES;
    public static final int MAX_PAGE_TEXT_CHARS = 100_000;

    private static final Set<String> FINAL_STATUSES = Set.of("COMPLETED", "PARTIAL", "FAILED");
    private static final String UNCLASSIFIED = "UNCLASSIFIED";

    private final PdfExtractionStorage storage;
    private final ObjectMapper mapper;

    public PdfExtractionResult parse(PdfExtractionJob job, ReceivePdfExtractionResultCommand command) {
        JsonNode root = command.result();
        requireValid(root != null && root.isObject(), "PDF 추출 결과가 올바르지 않습니다.");
        requireValid(mapper.writeValueAsBytes(root).length <= MAX_RESULT_BYTES, "PDF 추출 결과가 너무 큽니다.");
        String status = root.path("status").asText();
        requireValid(job.getId().equals(command.jobId())
                && PIPELINE_VERSION.equals(command.pipelineVersion())
                && storage.sourceFileKey(job).equals(command.sourceFileKey())
                && job.getId().equals(root.path("jobId").asText())
                && PIPELINE_VERSION.equals(root.path("pipelineVersion").asText())
                && storage.sourceFileKey(job).equals(root.path("source").path("key").asText())
                && FINAL_STATUSES.contains(status), "PDF 추출 결과의 작업 식별 정보가 올바르지 않습니다.");
        List<PdfExtractionResult.Page> pages = pages(job, root.path("pages"));
        List<String> warnings = new ArrayList<>();
        for (JsonNode warning : root.path("warnings")) {
            warningText(warning).ifPresent(warnings::add);
        }
        return new PdfExtractionResult(status, root.path("source").path("sha256").asText(),
                root.path("errorCode").asText(""), List.copyOf(warnings), pages);
    }

    private List<PdfExtractionResult.Page> pages(PdfExtractionJob job, JsonNode sourcePages) {
        requireValid(sourcePages.isArray() && sourcePages.size() <= MAX_PAGES, "PDF 추출 결과의 페이지 정보가 올바르지 않습니다.");
        List<PdfExtractionResult.Page> pages = new ArrayList<>();
        Set<Integer> numbers = new HashSet<>();
        int imageCount = 0;
        int textChars = 0;
        for (JsonNode page : sourcePages) {
            int number = page.path("number").asInt(0);
            JsonNode text = page.path("text");
            JsonNode images = page.path("images");
            requireValid(page.isObject() && number > 0 && number <= MAX_PAGES && numbers.add(number)
                    && (text.isMissingNode() || text.isString())
                    && (images.isMissingNode() || images.isArray()), "PDF 추출 결과의 페이지 정보가 올바르지 않습니다.");
            imageCount += images.size();
            textChars += text.asText("").length();
            requireValid(text.asText("").length() <= MAX_PAGE_TEXT_CHARS, "PDF 추출 결과의 페이지 문자가 너무 많습니다.");
            requireValid(imageCount <= MAX_IMAGES, "PDF 추출 결과의 이미지가 너무 많습니다.");
            requireValid(textChars <= MAX_TEXT_CHARS, "PDF 추출 결과의 문자가 너무 많습니다.");
            pages.add(new PdfExtractionResult.Page(number, text.asText(""), page.path("needsOcr").asBoolean(),
                    images(job, images)));
        }
        pages.sort(Comparator.comparingInt(PdfExtractionResult.Page::number));
        return List.copyOf(pages);
    }

    private List<PdfExtractionResult.Image> images(PdfExtractionJob job, JsonNode images) {
        List<PdfExtractionResult.Image> result = new ArrayList<>();
        String prefix = storage.imageFileKeyPrefix(job);
        for (JsonNode image : images) {
            if (!"EXTRACTED".equals(image.path("status").asText())) {
                continue;
            }
            String key = image.path("key").asText();
            String filename = key.startsWith(prefix) ? key.substring(prefix.length()) : "";
            requireValid(filename.matches("[a-zA-Z0-9_-]+\\.png"), "PDF 추출 이미지의 저장소 키가 올바르지 않습니다.");
            result.add(new PdfExtractionResult.Image(key, null, UNCLASSIFIED));
        }
        return List.copyOf(result);
    }

    private Optional<String> warningText(JsonNode warning) {
        if (warning.isString()) {
            return Optional.of(warning.asText()).filter(text -> !text.isBlank());
        }
        if (!warning.isObject()) {
            return Optional.empty();
        }
        String code = warning.path("code").asText("").trim();
        if (code.isEmpty()) {
            return Optional.empty();
        }
        List<String> locations = new ArrayList<>();
        if (warning.path("page").asInt(0) > 0) {
            locations.add(warning.path("page").asInt() + "쪽");
        }
        if (warning.path("image").asInt(0) > 0) {
            locations.add("이미지 " + warning.path("image").asInt());
        }
        return Optional.of(locations.isEmpty() ? code : code + " (" + String.join(", ", locations) + ")");
    }

    private void requireValid(boolean valid, String message) {
        if (!valid) {
            throw new BusinessException(INVALID_PDF_EXTRACTION_RESULT, message);
        }
    }
}
