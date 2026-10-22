package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostContent;
import art.yesulin.auditionpost.domain.alertchat.AlertChatMembers;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.function.Function;

/**
 * 공고 목록 카드.
 *
 * @param authorName 화면에 보이는 작성자. 기획사에 연결된 공고는 그 기획사의 지금 이름이다.
 * @param deadline 원문 마감이 날짜일 때만 값이 있다. 화면은 {@code deadlineText}를 그대로 보여 준다.
 * @param alertChatMembers 공고를 올린 시각의 공고 알림 오픈채팅방 인원. 화면이 공개 조회수 추정치를 계산할 때 쓴다.
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
        long viewCount,
        Instant postedAt,
        int alertChatMembers,
        String thumbnailUrl,
        int attachmentCount
) {

    static PublicAuditionPostSummaryResult from(
            AuditionPost post,
            String authorName,
            LocalDate today,
            ZoneId zone,
            AlertChatMembers members,
            Function<String, String> publicUrl
    ) {
        AuditionPostContent content = post.getContent();
        LocalDateTime sourcePostedAt = content.getSourcePostedAt();
        Instant postedAt = sourcePostedAt == null ? null : sourcePostedAt.atZone(zone).toInstant();
        String thumbnailUrl = post.images().stream()
                .findFirst()
                .map(image -> publicUrl.apply(image.getObjectKey()))
                .orElse(null);
        return new PublicAuditionPostSummaryResult(
                post.getId(),
                content.getCategory(),
                content.getTitle(),
                authorName,
                content.getPay(),
                content.getDeadlineText(),
                content.getDeadline(),
                post.isClosedOn(today),
                post.getViewCount(),
                postedAt,
                members.at(postedAt),
                thumbnailUrl,
                post.attachments().size()
        );
    }
}
