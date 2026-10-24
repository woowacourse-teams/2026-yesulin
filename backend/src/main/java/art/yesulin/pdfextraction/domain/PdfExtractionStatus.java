package art.yesulin.pdfextraction.domain;

public enum PdfExtractionStatus {

    UPLOADING, QUEUED, COMPLETED, PARTIAL, FAILED;

    public boolean isFinal() {
        return this == COMPLETED || this == PARTIAL || this == FAILED;
    }
}
