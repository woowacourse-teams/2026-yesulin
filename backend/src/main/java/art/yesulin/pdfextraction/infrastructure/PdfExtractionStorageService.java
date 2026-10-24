package art.yesulin.pdfextraction.infrastructure;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.INVALID_PDF;
import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_UPLOAD_NOT_READY;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.infrastructure.storage.S3PrivateObjects;
import art.yesulin.pdfextraction.application.PdfExtractionResult;
import art.yesulin.pdfextraction.application.PdfExtractionStorage;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** PDF application 전용 저장소 어댑터. 공통 객체 접근 컴포넌트를 PDF 경로·manifest 계약에 맞춰 조합한다. */
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfExtractionStorageService implements PdfExtractionStorage {

    private static final String ROOT = "private/pdf-extractions/";
    private static final String PIPELINE = "pdfium-v1";
    private static final int MAX_RESULT_BYTES = 2 * 1024 * 1024;
    private static final Set<String> FINAL_STATUSES = Set.of("COMPLETED", "PARTIAL", "FAILED");

    private final S3PrivateObjects objects;
    private final ObjectMapper mapper;

    @Override
    public UploadTarget prepare(PdfExtractionJob job) {
        S3PrivateObjects.Upload upload = objects.createOnce(sourceKey(job), "application/pdf", job.getSize());
        return new UploadTarget(upload.url(), upload.method(), upload.expiresAt(), upload.headers());
    }

    @Override
    public void verifySource(PdfExtractionJob job) {
        S3PrivateObjects.Metadata metadata = objects.inspect(sourceKey(job)).orElseThrow(() ->
                new BusinessException(PDF_UPLOAD_NOT_READY, "PDF 업로드를 아직 확인하지 못했습니다."));
        if (metadata.size() != job.getSize() || !"application/pdf".equals(metadata.contentType())) {
            throw new BusinessException(PDF_UPLOAD_NOT_READY, "PDF 업로드 정보가 일치하지 않습니다.");
        }
        String header = new String(objects.readPrefix(sourceKey(job), 1024), StandardCharsets.ISO_8859_1);
        if (!header.contains("%PDF-")) {
            throw new BusinessException(INVALID_PDF, "PDF 형식의 파일이 아닙니다.");
        }
    }

    @Override
    public Optional<PdfExtractionResult> findResult(PdfExtractionJob job) {
        return objects.readIfPresent(resultKey(job), MAX_RESULT_BYTES).map(bytes -> parse(job, bytes));
    }

    @Override
    public String sourceFileKey(PdfExtractionJob job) {
        return objects.physicalKey(sourceKey(job));
    }

    @Override
    public String resultFileKey(PdfExtractionJob job) {
        return objects.physicalKey(resultKey(job));
    }

    @Override
    public String sourceUrl(PdfExtractionJob job) {
        return objects.downloadUrl(sourceKey(job));
    }

    private PdfExtractionResult parse(PdfExtractionJob job, byte[] bytes) {
        JsonNode root = mapper.readTree(bytes);
        String status = root.path("status").asText();
        if (!job.getId().equals(root.path("jobId").asText())
                || !PIPELINE.equals(root.path("pipelineVersion").asText())
                || !sourceFileKey(job).equals(root.path("source").path("key").asText())
                || !FINAL_STATUSES.contains(status)) {
            throw new IllegalStateException("PDF 추출 결과의 작업 식별 정보가 올바르지 않습니다.");
        }
        List<PdfExtractionResult.Page> pages = new ArrayList<>();
        JsonNode sourcePages = root.path("pages");
        if (!sourcePages.isArray() || sourcePages.size() > 50) {
            throw new IllegalStateException("PDF 추출 결과의 페이지 정보가 올바르지 않습니다.");
        }
        for (JsonNode page : sourcePages) {
            pages.add(new PdfExtractionResult.Page(page.path("number").asInt(), page.path("text").asText(),
                    page.path("needsOcr").asBoolean(), images(job, page.path("images"))));
        }
        List<String> warnings = new ArrayList<>();
        for (JsonNode warning : root.path("warnings")) {
            warningText(warning).ifPresent(warnings::add);
        }
        return new PdfExtractionResult(status, root.path("source").path("sha256").asText(),
                root.path("errorCode").asText(""), List.copyOf(warnings), List.copyOf(pages));
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

    private List<PdfExtractionResult.Image> images(PdfExtractionJob job, JsonNode images) {
        List<PdfExtractionResult.Image> result = new ArrayList<>();
        for (JsonNode image : images) {
            if (!"EXTRACTED".equals(image.path("status").asText())) {
                continue;
            }
            String key = image.path("key").asText();
            String prefix = objects.physicalKey(resultRoot(job) + "images/");
            String filename = key.startsWith(prefix) ? key.substring(prefix.length()) : "";
            if (!filename.matches("[a-zA-Z0-9_-]+\\.png")) {
                throw new IllegalStateException("PDF 추출 이미지의 저장소 키가 올바르지 않습니다.");
            }
            result.add(new PdfExtractionResult.Image(key,
                    objects.downloadUrl(resultRoot(job) + "images/" + filename), "UNCLASSIFIED"));
        }
        return List.copyOf(result);
    }

    private String sourceKey(PdfExtractionJob job) {
        return ROOT + "inputs/" + job.getId() + "/source.pdf";
    }

    private String resultRoot(PdfExtractionJob job) {
        return ROOT + "results/" + job.getId() + "/" + PIPELINE + "/";
    }

    private String resultKey(PdfExtractionJob job) {
        return resultRoot(job) + "result.json";
    }
}
