package art.yesulin.file.application.report;

import art.yesulin.file.domain.FileStatus;
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
