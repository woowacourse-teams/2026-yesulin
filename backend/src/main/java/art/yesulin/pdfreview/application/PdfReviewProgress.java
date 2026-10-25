package art.yesulin.pdfreview.application;

public record PdfReviewProgress(
        long total,
        long uploading,
        long waiting,
        long completed,
        long partial,
        long failed,
        boolean complete
) {

    public PdfReviewProgress(long total, long uploading, long waiting, long completed, long partial, long failed) {
        this(total, uploading, waiting, completed, partial, failed, uploading == 0 && waiting == 0);
    }
}
