package art.yesulin.file.application.report;

import art.yesulin.file.domain.FileStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UnusedFileQueryService {

    private static final int UNUSED_DAYS = 7;

    private final UnusedFileCandidateReader reader;
    private final Clock clock;

    @Transactional(readOnly = true)
    public UnusedFilesResult find(Optional<FileStatus> status, int page, int size) {
        if (status.orElse(null) == FileStatus.DELETED) {
            throw new IllegalArgumentException("삭제된 파일은 미사용 목록에서 조회할 수 없습니다.");
        }
        List<UnusedFileCandidate> candidates = reader.readPage(status, page, size);
        Instant now = clock.instant();
        List<UnusedFileResult> files = candidates.stream().limit(size)
                .map(candidate -> toResult(candidate, now))
                .toList();
        return new UnusedFilesResult(files, page, size, candidates.size() > size);
    }

    private UnusedFileResult toResult(UnusedFileCandidate candidate, Instant now) {
        Instant deletableAt = candidate.unusedSince().plus(UNUSED_DAYS, ChronoUnit.DAYS);
        boolean deletable = candidate.status() == FileStatus.DELETING || !now.isBefore(deletableAt);
        return new UnusedFileResult(
                candidate.fileId(), candidate.ownerId(), candidate.status(), candidate.storageScope(),
                candidate.createdAt(), candidate.unusedSince(), deletableAt, deletable
        );
    }
}
