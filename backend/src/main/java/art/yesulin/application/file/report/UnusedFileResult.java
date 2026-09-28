package art.yesulin.application.file.report;

import art.yesulin.domain.file.FileStatus;
import java.time.Instant;

public record UnusedFileResult(
        long fileId,
        long ownerId,
        FileStatus status,
        String storageScope,
        Instant createdAt,
        Instant unusedSince,
        Instant deletableAt,
        boolean deletable
) {
}
