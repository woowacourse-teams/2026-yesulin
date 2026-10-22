package art.yesulin.auditionpost.domain.alertchat;

import art.yesulin.auditionpost.domain.AuditionPostStatus;
import java.time.LocalDateTime;

public record OpenChatPostVisits(
        long postId,
        String title,
        AuditionPostStatus status,
        LocalDateTime postedAt,
        long visitCount
) {
}
