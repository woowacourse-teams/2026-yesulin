package art.yesulin.pdfextraction.application;

import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import java.util.Map;
import java.util.Optional;

public interface DocumentPreviewTransferStorage {

    enum File { ORIGINAL, PREVIEW, INPUT }

    record ObjectInfo(String contentType, long size, String sha256, String etag) {
    }

    record Transfer(String url, String method, Map<String, String> headers, long size, String sha256) {

        @Override
        public String toString() {
            return "Transfer[method=" + method + ", size=" + size + "]";
        }
    }

    String canonicalOriginalKey(PdfExtractionJob job);

    Optional<ObjectInfo> inspect(PdfExtractionJob job, File file);

    Transfer read(PdfExtractionJob job, File file, ObjectInfo info);

    Transfer writePdfOnce(PdfExtractionJob job, File file, long size, String sha256);
}
