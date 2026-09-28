package art.yesulin.application.file.report;

import java.time.Instant;

public record UnusedFileCursor(Instant createdAt, long fileId) {
}
