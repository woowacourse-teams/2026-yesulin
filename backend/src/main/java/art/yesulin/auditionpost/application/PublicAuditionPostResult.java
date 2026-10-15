package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostContent;
import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.company.application.CompanySummary;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.function.Function;

/**
 * 공고 상세. 출처는 상세 화면에 작은 원문 링크로 밝힌다.
 *
 * @param authorName 화면에 보이는 작성자. 기획사에 연결된 공고는 그 기획사의 지금 이름이다.
 * @param source 원문 공고 사이트 이름(예: {@code OTR})
 * @param sourceUrl 원문 공고 주소
 * @param bodyHtml 서버가 허용 태그만 남긴 HTML. 사진 주소는 이 응답을 만들 때 채운다.
 * @param company 공고를 올린 공연사 요약. 연결이 없거나 공연사를 공개하기 전이면 null이다.
 */
public record PublicAuditionPostResult(
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
        String bodyHtml,
        List<String> tags,
        List<Attachment> attachments,
        String source,
        String sourceUrl,
        Instant updatedAt,
        CompanySummary company
) {

    static PublicAuditionPostResult from(
            AuditionPost post,
            String authorName,
            CompanySummary company,
            LocalDate today,
            ZoneId zone,
            Function<String, String> publicUrl
    ) {
        AuditionPostContent content = post.getContent();
        List<String> imageUrls = post.images().stream().map(image -> publicUrl.apply(image.getObjectKey())).toList();
        return new PublicAuditionPostResult(
                post.getId(),
                content.getCategory(),
                content.getTitle(),
                authorName,
                content.getPay(),
                content.getDeadlineText(),
                content.getDeadline(),
                post.isClosedOn(today),
                post.getViewCount(),
                content.getSourcePostedAt() == null ? null : content.getSourcePostedAt().atZone(zone).toInstant(),
                AuditionPostBody.render(content.getBodyHtml(), imageUrls),
                List.copyOf(post.getTags()),
                post.attachments().stream().map(file -> Attachment.from(file, publicUrl)).toList(),
                post.getSource(),
                post.getSourceUrl(),
                post.getUpdatedAt(),
                company
        );
    }

    public record Attachment(String name, String contentType, long size, String url) {

        static Attachment from(AuditionPostFile file, Function<String, String> publicUrl) {
            return new Attachment(
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getSize(),
                    publicUrl.apply(file.getObjectKey())
            );
        }
    }
}
