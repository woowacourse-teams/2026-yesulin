package art.yesulin.auditionpost.application;

import java.util.List;

/**
 * 운영자가 고친 공고 내용. 원문 작성 시각과 출처는 바꾸지 않는다.
 *
 * @param bodyHtml 편집기 본문. null이면 본문과 사진을 그대로 둔다.
 * @param attachmentUrls 남길 첨부파일의 공개 주소. 이 공고의 첨부만 받으며 빠진 첨부는 지운다.
 */
public record AuditionPostEditCommand(
        String category,
        String title,
        String pay,
        String deadlineText,
        String authorName,
        String bodyHtml,
        List<String> tags,
        List<String> attachmentUrls
) {
}
