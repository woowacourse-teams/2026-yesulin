package art.yesulin.pdfextraction.application;

import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

/** PDF 추출 application의 저장소 경계. S3 형식과 SDK는 구현에서만 다룬다. */
public interface PdfExtractionStorage {

    UploadTarget prepare(PdfExtractionJob job);

    void verifySource(PdfExtractionJob job);

    String sourceFileKey(PdfExtractionJob job);

    String resultFileKey(PdfExtractionJob job);

    String imageFileKeyPrefix(PdfExtractionJob job);

    String sourceUrl(PdfExtractionJob job);

    String imageUrl(PdfExtractionJob job, String imageFileKey);

    /** 이 작업의 추출 이미지 하나를 읽는다. 없으면 비어 있고, 다른 작업의 키는 거부한다. */
    Optional<byte[]> readImage(PdfExtractionJob job, String imageFileKey, int maxBytes);

    /** 원본 PDF와 추출 결과·이미지를 모두 지운다. 이미 지웠으면 아무것도 하지 않는다. */
    void deleteAll(PdfExtractionJob job);

    record UploadTarget(String url, String method, Instant expiresAt, Map<String, String> headers) {
    }
}
