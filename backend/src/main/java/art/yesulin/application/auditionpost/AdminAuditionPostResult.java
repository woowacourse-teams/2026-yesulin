package art.yesulin.application.auditionpost;

import art.yesulin.domain.auditionpost.AuditionPost;
import art.yesulin.domain.auditionpost.AuditionPostStatus;
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
        boolean autoPublished,
        long viewCount,
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
                post.isAutoPublished(),
                post.getViewCount(),
                post.images().size(),
                post.attachments().size(),
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }
}
