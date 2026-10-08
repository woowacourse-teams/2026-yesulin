package art.yesulin.file.application.report;

import art.yesulin.file.domain.FileStatus;
import java.util.List;
import java.util.Optional;

public interface UnusedFileCandidateReader {

    List<UnusedFileCandidate> readPage(Optional<FileStatus> status, int page, int size);

    Optional<UnusedFileCandidate> findById(long fileId);
}
