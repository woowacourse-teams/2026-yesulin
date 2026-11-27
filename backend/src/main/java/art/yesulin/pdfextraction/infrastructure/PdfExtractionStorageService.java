package art.yesulin.pdfextraction.infrastructure;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.INVALID_PDF;
import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_UPLOAD_NOT_READY;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.infrastructure.storage.S3PrivateObjects;
import art.yesulin.pdfextraction.application.PdfExtractionResultParser;
import art.yesulin.pdfextraction.application.PdfExtractionStorage;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ContentDisposition;
import org.springframework.stereotype.Service;

/** PDF application 전용 저장소 어댑터. 공통 객체 접근 컴포넌트를 PDF 경로 계약에 맞춰 조합한다. */
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfExtractionStorageService implements PdfExtractionStorage {

    private static final String ROOT = "private/pdf-extractions/";

    private final S3PrivateObjects objects;

    @Override
    public UploadTarget prepare(PdfExtractionJob job) {
        S3PrivateObjects.Upload upload = objects.createOnce(originalKey(job), job.getFileMetadata().getContentType(),
                job.getSize(), job.getSourceSha256());
        return new UploadTarget(upload.url(), upload.method(), upload.expiresAt(), upload.headers());
    }

    @Override
    public void verifySource(PdfExtractionJob job) {
        S3PrivateObjects.Metadata metadata = objects.inspect(originalKey(job)).orElseThrow(() ->
                new BusinessException(PDF_UPLOAD_NOT_READY, "PDF 업로드를 아직 확인하지 못했습니다."));
        if (metadata.size() != job.getSize()
                || !job.getFileMetadata().getContentType().equals(metadata.contentType())) {
            throw new BusinessException(PDF_UPLOAD_NOT_READY, "PDF 업로드 정보가 일치하지 않습니다.");
        }
        byte[] header = objects.readPrefix(originalKey(job), 1024);
        boolean recognized = switch (job.getFileMetadata().getType()) {
            case PDF -> new String(header, StandardCharsets.ISO_8859_1).contains("%PDF-");
            case HWP -> startsWith(header, HexFormat.of().parseHex("d0cf11e0a1b11ae1"));
            case DOCX, PPTX, HWPX -> startsWith(header, new byte[] {'P', 'K', 3, 4});
        };
        if (!recognized) {
            throw new BusinessException(INVALID_PDF, "파일 내용이 제출 형식과 일치하지 않습니다.");
        }
    }

    private boolean startsWith(byte[] content, byte[] prefix) {
        return content.length >= prefix.length && Arrays.equals(content, 0, prefix.length, prefix, 0, prefix.length);
    }

    @Override
    public String extractionInputFileKey(PdfExtractionJob job) {
        if (job.requiresConversion()) {
            return objects.physicalKey(sourceKey(job));
        }
        return sourceFileKey(job);
    }

    @Override
    public void verifyPreview(PdfExtractionJob job, String digest) {
        String checksum = Base64.getEncoder().encodeToString(HexFormat.of().parseHex(digest));
        S3PrivateObjects.VerifiedMetadata file = objects.inspectWithChecksum(previewKey(job)).orElseThrow(() ->
                new BusinessException(PDF_UPLOAD_NOT_READY, "변환 PDF를 확인하지 못했습니다."));
        if (file.size() <= 0 || file.size() > PdfExtractionJob.MAX_FILE_BYTES
                || !"application/pdf".equals(file.contentType()) || !checksum.equals(file.base64Sha256())) {
            throw new BusinessException(INVALID_PDF, "변환 PDF 메타데이터가 일치하지 않습니다.");
        }
    }

    @Override
    public String originalDownloadUrl(PdfExtractionJob job) {
        String filename = job.getOriginalFilename().replace('/', '_').replace((char) 92, '_');
        String disposition = ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8)
                .build().toString();
        return objects.attachmentUrl(originalKey(job), disposition);
    }

    @Override
    public String sourceFileKey(PdfExtractionJob job) {
        return job.getFileKey() == null ? objects.physicalKey(originalKey(job)) : job.getFileKey();
    }

    @Override
    public String resultFileKey(PdfExtractionJob job) {
        return objects.physicalKey(resultRoot(job) + "result.json");
    }

    @Override
    public String imageFileKeyPrefix(PdfExtractionJob job) {
        return objects.physicalKey(imageRoot(job));
    }

    @Override
    public String sourceUrl(PdfExtractionJob job) {
        if (job.requiresConversion()) {
            return objects.downloadUrl(previewKey(job));
        }
        return objects.downloadUrl(sourceKey(job));
    }

    @Override
    public String imageUrl(PdfExtractionJob job, String imageFileKey) {
        String prefix = imageFileKeyPrefix(job);
        if (!imageFileKey.startsWith(prefix)) {
            throw new IllegalArgumentException("PDF 추출 이미지의 저장소 키가 올바르지 않습니다.");
        }
        return objects.downloadUrl(imageRoot(job) + imageFileKey.substring(prefix.length()));
    }

    @Override
    public Optional<byte[]> readImage(PdfExtractionJob job, String imageFileKey, int maxBytes) {
        String prefix = imageFileKeyPrefix(job);
        if (!imageFileKey.startsWith(prefix)) {
            throw new IllegalArgumentException("PDF 추출 이미지의 저장소 키가 올바르지 않습니다.");
        }
        return objects.readIfPresent(imageRoot(job) + imageFileKey.substring(prefix.length()), maxBytes);
    }

    @Override
    public void deleteAll(PdfExtractionJob job) {
        if (job.requiresConversion()) {
            objects.deleteAll(ROOT + "originals/" + scope(job) + job.getId() + "/");
            objects.deleteAll(ROOT + "previews/" + scope(job) + job.getId() + "/");
        }
        objects.deleteAll(ROOT + "inputs/" + scope(job) + job.getId() + "/");
        objects.deleteAll(ROOT + "results/" + scope(job) + job.getId() + "/");
    }

    private String originalKey(PdfExtractionJob job) {
        if (job.requiresConversion()) {
            return ROOT + "originals/" + scope(job) + job.getId() + "/source." + job.getFileMetadata().getExtension();
        }
        return sourceKey(job);
    }

    private String previewKey(PdfExtractionJob job) {
        return ROOT + "previews/" + scope(job) + job.getId() + "/preview.pdf";
    }

    private String sourceKey(PdfExtractionJob job) {
        return ROOT + "inputs/" + scope(job) + job.getId() + "/source.pdf";
    }

    private String resultRoot(PdfExtractionJob job) {
        return ROOT + "results/" + scope(job) + job.getId() + "/" + PdfExtractionResultParser.PIPELINE_VERSION + "/";
    }

    private String scope(PdfExtractionJob job) {
        return job.getReviewId() == null ? "" : job.getReviewId() + "/";
    }

    private String imageRoot(PdfExtractionJob job) {
        return resultRoot(job) + "images/";
    }
}
