package art.yesulin.pdfextraction.application;

import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import java.time.Instant;
import java.util.Map;

/** PDF 추출 application의 저장소 경계. S3 형식과 SDK는 구현에서만 다룬다. */
public interface PdfExtractionStorage {

    UploadTarget prepare(PdfExtractionJob job);

    void verifySource(PdfExtractionJob job);

    String sourceFileKey(PdfExtractionJob job);

    String resultFileKey(PdfExtractionJob job);

    String imageFileKeyPrefix(PdfExtractionJob job);

    String sourceUrl(PdfExtractionJob job);

    String imageUrl(PdfExtractionJob job, String imageFileKey);

    record UploadTarget(String url, String method, Instant expiresAt, Map<String, String> headers) {
    }
}
