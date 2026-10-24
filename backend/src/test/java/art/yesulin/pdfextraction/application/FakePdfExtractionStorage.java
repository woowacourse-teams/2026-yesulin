package art.yesulin.pdfextraction.application;

import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import java.time.Instant;
import java.util.Map;

public class FakePdfExtractionStorage implements PdfExtractionStorage {

    private int verifications;
    private int signedUrls;
    private boolean rejectUpload;

    public int verifications() {
        return verifications;
    }

    public int signedUrls() {
        return signedUrls;
    }

    public void rejectUpload() {
        rejectUpload = true;
    }

    @Override
    public UploadTarget prepare(PdfExtractionJob job) {
        return new UploadTarget("http://localhost/upload", "PUT", Instant.parse("2026-10-23T00:10:00Z"), Map.of());
    }

    @Override
    public void verifySource(PdfExtractionJob job) {
        verifications++;
        if (rejectUpload) {
            throw new IllegalArgumentException("metadata mismatch");
        }
    }

    @Override
    public String sourceFileKey(PdfExtractionJob job) {
        return "yesulin/inputs/" + job.getId() + "/source.pdf";
    }

    @Override
    public String resultFileKey(PdfExtractionJob job) {
        return "yesulin/results/" + job.getId() + "/pdfium-v1/result.json";
    }

    @Override
    public String imageFileKeyPrefix(PdfExtractionJob job) {
        return "yesulin/results/" + job.getId() + "/pdfium-v1/images/";
    }

    @Override
    public String sourceUrl(PdfExtractionJob job) {
        signedUrls++;
        return "http://localhost/source.pdf";
    }

    @Override
    public String imageUrl(PdfExtractionJob job, String imageFileKey) {
        signedUrls++;
        return "http://localhost/" + imageFileKey;
    }
}
