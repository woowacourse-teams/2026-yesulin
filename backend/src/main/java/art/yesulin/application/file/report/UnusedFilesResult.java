package art.yesulin.application.file.report;

import java.util.List;

public record UnusedFilesResult(List<UnusedFileResult> files, int page, int size, boolean hasNext) {
}
