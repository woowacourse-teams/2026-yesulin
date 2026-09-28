package art.yesulin.application.file.report;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UnusedFileCandidateReader {

    List<UnusedFileCandidate> readPage(Instant cutoff, Optional<UnusedFileCursor> after, int limit);
}
