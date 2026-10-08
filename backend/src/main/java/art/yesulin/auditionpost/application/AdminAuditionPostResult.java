package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostStatus;
import java.time.Instant;
import java.time.LocalDate;

public record AdminAuditionPostResult(
        long id,
        String source,
        String externalId,
        String sourceUrl,
        String category,
        String title,
        String authorName,
        String deadlineText,
        boolean closed,
        AuditionPostStatus status,
        boolean autoImported,
        long viewCount,
        long redirectCount,
        int imageCount,
        int attachmentCount,
        Instant createdAt,
        Instant updatedAt
) {

    static AdminAuditionPostResult from(AuditionPost post, LocalDate today) {
        return new AdminAuditionPostResult(
                post.getId(),
                post.getSource(),
                post.getExternalId(),
                post.getSourceUrl(),
                post.getContent().getCategory(),
                post.getContent().getTitle(),
                post.getContent().getAuthorName(),
                post.getContent().getDeadlineText(),
                post.isClosedOn(today),
                post.getStatus(),
                post.isAutoImported(),
                post.getViewCount(),
                post.getRedirectCount(),
                post.images().size(),
                post.attachments().size(),
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }
}
