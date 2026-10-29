package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.domain.AuditionPostStatus;
import art.yesulin.auditionpost.domain.alertchat.OpenChatPostVisits;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

public record AdminOpenChatVisitsResult(
        List<Post> posts,
        int page,
        int size,
        int totalPages,
        long totalElements,
        long totalVisits
) {

    public record Post(
            long postId,
            String title,
            AuditionPostStatus status,
            Instant postedAt,
            long visitCount
    ) {

        public static Post from(OpenChatPostVisits post) {
            Instant postedAt = post.postedAt() == null ? null
                    : post.postedAt().atZone(ZoneId.of("Asia/Seoul")).toInstant();
            return new Post(post.postId(), post.title(), post.status(), postedAt,
                    post.visitCount());
        }
    }
}
