package art.yesulin.dormant.application.auditionnotice;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record NoticeCommand(Long targetStageId, String template, List<Recipient> recipients) {

    public record Recipient(UUID submissionId, LocalDateTime appointment) {
    }
}
