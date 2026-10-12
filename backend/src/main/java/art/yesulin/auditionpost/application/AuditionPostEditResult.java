package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostContent;
import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.auditionpost.domain.AuditionPostStatus;
import java.time.Instant;
import java.util.List;
import java.util.function.Function;

/**
 * 운영자와 소유 기획사의 수정 화면에 채울 공고 내용.
 *
 * @param authorName 저장된 작성자(원문 닉네임이나 운영자가 쓴 이름). 기획사에 연결된 공고는 화면에 기획사 이름이 보인다.
 * @param bodyHtml 사진 자리를 공개 주소로 채운 본문. 편집기가 그대로 보여 주고, 저장할 때 같은 주소로 사진을 알아본다.
 * @param owner 공고를 고칠 수 있는 기획사. 연결되지 않았으면 null이다.
 */
public record AuditionPostEditResult(
        long id,
        String source,
        String externalId,
        String sourceUrl,
        AuditionPostStatus status,
        String category,
        String title,
        String pay,
        String deadlineText,
        String authorName,
        String bodyHtml,
        List<String> tags,
        List<Attachment> attachments,
        Instant editedAt,
        Instant updatedAt,
        Owner owner
) {

    static AuditionPostEditResult from(
            AuditionPost post,
            Function<AuditionPostFile, String> publicUrl,
            String ownerName
    ) {
        AuditionPostContent content = post.getContent();
        List<String> imageUrls = post.images().stream().map(publicUrl).toList();
        return new AuditionPostEditResult(
                post.getId(),
                post.getSource(),
                post.getExternalId(),
                post.getSourceUrl(),
                post.getStatus(),
                content.getCategory(),
                content.getTitle(),
                content.getPay(),
                content.getDeadlineText(),
                content.getAuthorName(),
                AuditionPostBody.render(content.getBodyHtml(), imageUrls),
                List.copyOf(post.getTags()),
                post.attachments().stream().map(file -> Attachment.from(file, publicUrl)).toList(),
                post.getEditedAt(),
                post.getUpdatedAt(),
                post.getOwnerId() == null ? null : new Owner(post.getOwnerId(), ownerName)
        );
    }

    /**
     * 공고를 고칠 수 있는 기획사.
     *
     * @param companyName 기획사 정보가 없어졌으면 null이다.
     */
    public record Owner(long memberId, String companyName) {
    }

    public record Attachment(String name, String contentType, long size, String url) {

        static Attachment from(AuditionPostFile file, Function<AuditionPostFile, String> publicUrl) {
            return new Attachment(
                    file.getOriginalFilename(), file.getContentType(), file.getSize(), publicUrl.apply(file)
            );
        }
    }
}
