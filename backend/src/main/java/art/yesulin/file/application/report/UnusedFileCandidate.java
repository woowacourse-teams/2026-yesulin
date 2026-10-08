package art.yesulin.file.application.report;

import art.yesulin.file.domain.FileStatus;
import java.time.Instant;

public record UnusedFileCandidate(
        long fileId, long ownerId, FileStatus status, Instant createdAt, Instant unusedSince, String storageScope
) {
}
