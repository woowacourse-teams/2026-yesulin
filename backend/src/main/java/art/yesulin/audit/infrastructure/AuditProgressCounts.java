package art.yesulin.audit.infrastructure;

import art.yesulin.audit.application.AuditProgress;

public record AuditProgressCounts(
        long total,
        long uploading,
        long waiting,
        long completed,
        long partial,
        long failed,
        long queued,
        long pdfCompleted,
        long pdfPartial,
        long aiNotQueued,
        long aiPending,
        long aiRunning,
        long aiCompleted,
        long aiFailed,
        long aiSkipped
) {

    public AuditProgress toProgress() {
        return new AuditProgress(total, uploading, waiting, completed, partial, failed,
                uploading == 0 && waiting == 0,
                new AuditProgress.PdfStages(uploading, queued, pdfCompleted, pdfPartial, failed),
                new AuditProgress.AiStages(aiNotQueued, aiPending, aiRunning, aiCompleted, aiFailed, aiSkipped));
    }
}
