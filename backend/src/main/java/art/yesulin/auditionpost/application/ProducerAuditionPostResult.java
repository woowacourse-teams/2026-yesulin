package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostStatus;
import java.time.Instant;
import java.time.LocalDate;

/** 기획사 내 공고 목록의 한 줄. 운영자가 숨긴 공고도 상태와 함께 보여 준다. */
public record ProducerAuditionPostResult(
        long id,
        String category,
        String title,
        String deadlineText,
        boolean closed,
        AuditionPostStatus status,
        long viewCount,
        Instant createdAt,
        Instant updatedAt
) {

    static ProducerAuditionPostResult from(AuditionPost post, LocalDate today) {
        return new ProducerAuditionPostResult(
                post.getId(),
                post.getContent().getCategory(),
                post.getContent().getTitle(),
                post.getContent().getDeadlineText(),
                post.isClosedOn(today),
                post.getStatus(),
                post.getViewCount(),
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }
}
