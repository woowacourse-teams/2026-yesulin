package art.yesulin.application.file.report;

import art.yesulin.domain.file.FileStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UnusedFileReportService {

    private static final Logger LOGGER = LoggerFactory.getLogger(UnusedFileReportService.class);
    private static final int PAGE_SIZE = 500;
    private static final int UNUSED_DAYS = 7;

    private final UnusedFileCandidateReader reader;
    private final Clock clock;

    public UnusedFileReportSummary generate() {
        Instant cutoff = clock.instant().minus(UNUSED_DAYS, ChronoUnit.DAYS);
        long pendingCount = 0L;
        long readyCount = 0L;
        Optional<UnusedFileCursor> after = Optional.empty();

        while (true) {
            List<UnusedFileCandidate> page = reader.readPage(cutoff, after, PAGE_SIZE);
            for (UnusedFileCandidate candidate : page) {
                LOGGER.info(
                        "UNUSED_FILE_CANDIDATE fileId={} status={} createdAt={}",
                        candidate.fileId(), candidate.status(), candidate.createdAt()
                );
                if (candidate.status() == FileStatus.PENDING) {
                    pendingCount++;
                } else {
                    readyCount++;
                }
            }
            if (page.size() < PAGE_SIZE) {
                break;
            }
            UnusedFileCandidate last = page.getLast();
            after = Optional.of(new UnusedFileCursor(last.createdAt(), last.fileId()));
        }

        UnusedFileReportSummary summary = new UnusedFileReportSummary(cutoff, pendingCount, readyCount);
        LOGGER.info(
                "UNUSED_FILE_REPORT cutoff={} pending={} ready={} total={}",
                summary.cutoff(), summary.pendingCount(), summary.readyCount(), summary.totalCount()
        );
        return summary;
    }
}
