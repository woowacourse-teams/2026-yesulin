package art.yesulin.application.file.report;

import java.time.Instant;

public record UnusedFileReportSummary(Instant cutoff, long pendingCount, long readyCount) {

    public long totalCount() {
        return pendingCount + readyCount;
    }
}
