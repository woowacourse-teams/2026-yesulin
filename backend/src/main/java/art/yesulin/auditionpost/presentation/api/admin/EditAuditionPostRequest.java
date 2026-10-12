package art.yesulin.auditionpost.presentation.api.admin;

import art.yesulin.auditionpost.application.AuditionPostEditCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * 운영자가 고친 공고 내용. 길이와 분류는 도메인이 검증한다.
 *
 * @param bodyHtml 편집기 본문. 본문을 건드리지 않았으면 null을 보내 원래 본문과 사진을 그대로 둔다.
 * @param attachmentUrls 남길 첨부파일의 공개 주소. 빠진 첨부는 지운다.
 */
public record EditAuditionPostRequest(
        @NotBlank String category,
        @NotBlank String title,
        String pay,
        String deadlineText,
        String authorName,
        String bodyHtml,
        List<String> tags,
        @NotNull List<String> attachmentUrls
) {

    public AuditionPostEditCommand toCommand() {
        return new AuditionPostEditCommand(
                category, title, pay, deadlineText, authorName, bodyHtml, tags, attachmentUrls
        );
    }
}
