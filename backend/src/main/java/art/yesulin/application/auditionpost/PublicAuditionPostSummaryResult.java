package art.yesulin.application.auditionpost;

import art.yesulin.domain.auditionpost.AuditionPost;
import art.yesulin.domain.auditionpost.AuditionPostContent;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.function.Function;

/**
 * 공고 목록 카드.
 *
 * @param deadline 원문 마감이 날짜일 때만 값이 있다. 화면은 {@code deadlineText}를 그대로 보여 준다.
 * @param thumbnailUrl 본문 첫 사진. 사진이 없으면 null이다.
 */
public record PublicAuditionPostSummaryResult(
        long id,
        String category,
        String title,
        String authorName,
        String pay,
        String deadlineText,
        LocalDate deadline,
        boolean closed,
        Instant postedAt,
        String thumbnailUrl,
        int attachmentCount
) {

    static PublicAuditionPostSummaryResult from(
            AuditionPost post,
            LocalDate today,
            ZoneId zone,
            Function<String, String> publicUrl
    ) {
        AuditionPostContent content = post.getContent();
        String thumbnailUrl = post.images().stream()
                .findFirst()
                .map(image -> publicUrl.apply(image.getObjectKey()))
                .orElse(null);
        return new PublicAuditionPostSummaryResult(
                post.getId(),
                content.getCategory(),
                content.getTitle(),
                content.getAuthorName(),
                content.getPay(),
                content.getDeadlineText(),
                content.getDeadline(),
                post.isClosedOn(today),
                content.getSourcePostedAt() == null ? null : content.getSourcePostedAt().atZone(zone).toInstant(),
                thumbnailUrl,
                post.attachments().size()
        );
    }
}
