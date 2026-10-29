package art.yesulin.audit.application;

public record AuditProgress(
        long total,
        long uploading,
        long waiting,
        long completed,
        long partial,
        long failed,
        boolean complete,
        PdfStages pdf,
        AiStages ai
) {

    public AuditProgress(long total, long uploading, long waiting, long completed, long partial, long failed,
                         boolean complete) {
        this(total, uploading, waiting, completed, partial, failed, complete, PdfStages.EMPTY, AiStages.EMPTY);
    }

    public AuditProgress(long total, long uploading, long waiting, long completed, long partial, long failed) {
        this(total, uploading, waiting, completed, partial, failed, uploading == 0 && waiting == 0);
    }

    public record PdfStages(long uploading, long queued, long completed, long partial, long failed) {

        static final PdfStages EMPTY = new PdfStages(0, 0, 0, 0, 0);
    }

    public record AiStages(long notQueued, long pending, long running, long completed, long failed, long skipped) {

        static final AiStages EMPTY = new AiStages(0, 0, 0, 0, 0, 0);
    }
}
