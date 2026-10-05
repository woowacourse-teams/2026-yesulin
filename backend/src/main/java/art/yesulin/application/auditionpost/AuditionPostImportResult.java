package art.yesulin.application.auditionpost;

import java.util.List;

/**
 * 가져오기 결과.
 *
 * @param created 처음 가져왔으면 true, 이미 있던 공고를 원문으로 교체했으면 false
 * @param skippedAttachments 형식·크기 기준에 맞지 않아 옮기지 않은 첨부파일. 원문에서 직접 받아야 한다.
 */
public record AuditionPostImportResult(
        AdminAuditionPostResult post,
        boolean created,
        List<SkippedFile> skippedAttachments
) {

    public AuditionPostImportResult {
        skippedAttachments = List.copyOf(skippedAttachments);
    }

    public record SkippedFile(String filename, String reason) {
    }
}
