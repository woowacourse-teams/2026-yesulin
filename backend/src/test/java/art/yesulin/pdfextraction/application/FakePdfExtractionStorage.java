package art.yesulin.pdfextraction.application;

import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class FakePdfExtractionStorage implements PdfExtractionStorage {

    private int verifications;
    private int signedUrls;
    private boolean rejectUpload;
    private final List<String> deletedJobs = new ArrayList<>();
    private final Map<String, byte[]> images = new HashMap<>();

    public List<String> deletedJobs() {
        return deletedJobs;
    }

    public void storeImage(String imageFileKey, byte[] content) {
        images.put(imageFileKey, content);
    }

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

    @Override
    public Optional<byte[]> readImage(PdfExtractionJob job, String imageFileKey, int maxBytes) {
        if (!imageFileKey.startsWith(imageFileKeyPrefix(job))) {
            throw new IllegalArgumentException("PDF 추출 이미지의 저장소 키가 올바르지 않습니다.");
        }
        return Optional.ofNullable(images.get(imageFileKey));
    }

    @Override
    public void deleteAll(PdfExtractionJob job) {
        deletedJobs.add(job.getId());
    }
}
