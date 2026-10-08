package art.yesulin.auditionpost.application;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 출처에서 읽은 공고 원문. 페이·마감은 원문 표현 그대로이고 작성 시각은 한국 시간이다.
 *
 * @param bodyHtml 허용 태그만 남긴 본문. {@code images[i]}의 자리는 {@code post-file:i}로 표시돼 있다.
 */
public record SourcePost(
        String externalId,
        String sourceUrl,
        String category,
        String title,
        String pay,
        String deadline,
        String authorName,
        LocalDateTime postedAt,
        String bodyHtml,
        List<String> tags,
        List<SourceFile> images,
        List<SourceFile> attachments
) {

    public SourcePost {
        tags = List.copyOf(tags);
        images = List.copyOf(images);
        attachments = List.copyOf(attachments);
    }
}
