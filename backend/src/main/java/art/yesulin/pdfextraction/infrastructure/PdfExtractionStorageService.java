package art.yesulin.pdfextraction.infrastructure;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.INVALID_PDF;
import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_UPLOAD_NOT_READY;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.infrastructure.storage.S3PrivateObjects;
import art.yesulin.pdfextraction.application.PdfExtractionResultParser;
import art.yesulin.pdfextraction.application.PdfExtractionStorage;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
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
    public String sourceFileKey(PdfExtractionJob job) {
        return job.getFileKey() == null ? objects.physicalKey(sourceKey(job)) : job.getFileKey();
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
        objects.deleteAll(ROOT + "inputs/" + scope(job) + job.getId() + "/");
        objects.deleteAll(ROOT + "results/" + scope(job) + job.getId() + "/");
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
