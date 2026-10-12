package art.yesulin.auditionpost.presentation.api.producer;

import art.yesulin.auditionpost.application.AuditionPostWriteCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * 기획사가 올리거나 고친 공고 내용. 작성자는 서버가 기획사 이름으로 정하므로 받지 않는다. 길이와 분류는 도메인이 검증한다.
 *
 * @param bodyHtml 편집기 본문. 고칠 때 본문을 건드리지 않았으면 null을 보내 원래 본문과 사진을 그대로 둔다.
 * @param attachmentUrls 남기거나 더할 첨부파일의 공개 주소. 빠진 첨부는 지운다.
 */
public record ProducerWriteAuditionPostRequest(
        @NotBlank String category,
        @NotBlank String title,
        String pay,
        String deadlineText,
        String bodyHtml,
        List<String> tags,
        @NotNull List<String> attachmentUrls
) {

    public AuditionPostWriteCommand toCommand() {
        return new AuditionPostWriteCommand(category, title, pay, deadlineText, null, bodyHtml, tags, attachmentUrls);
    }
}
