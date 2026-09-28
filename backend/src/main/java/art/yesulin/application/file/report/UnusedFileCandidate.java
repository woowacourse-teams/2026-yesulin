package art.yesulin.application.file.report;

import art.yesulin.domain.file.FileStatus;
import java.time.Instant;

public record UnusedFileCandidate(long fileId, FileStatus status, Instant createdAt) {
}
