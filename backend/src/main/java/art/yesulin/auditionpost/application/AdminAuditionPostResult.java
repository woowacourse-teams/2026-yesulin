package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostCreation;
import art.yesulin.auditionpost.domain.AuditionPostStatus;
import java.time.Instant;
import java.time.LocalDate;

/**
 * 운영 공고 목록의 한 줄.
 *
 * @param authorName 저장된 작성자(원문 닉네임이나 운영자가 쓴 이름). 기획사에 연결된 공고는 화면에 {@code ownerName}이 보인다.
 */
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
        AuditionPostCreation createdVia,
        long viewCount,
        long redirectCount,
        int imageCount,
        int attachmentCount,
        Instant createdAt,
        Instant updatedAt,
        Instant editedAt,
        Long ownerId,
        String ownerName
) {

    /**
     * 운영 목록의 한 줄을 만든다.
     *
     * @param ownerName 연결된 기획사 이름. 연결이 없거나 기획사 정보가 없어졌으면 null이다.
     */
    static AdminAuditionPostResult from(AuditionPost post, LocalDate today, String ownerName) {
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
                post.getCreatedVia(),
                post.getViewCount(),
                post.getRedirectCount(),
                post.images().size(),
                post.attachments().size(),
                post.getCreatedAt(),
                post.getUpdatedAt(),
                post.getEditedAt(),
                post.getOwnerId(),
                ownerName
        );
    }
}
