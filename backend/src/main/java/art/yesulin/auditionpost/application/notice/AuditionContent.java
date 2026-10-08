package art.yesulin.auditionpost.application.notice;

import static art.yesulin.global.validation.DomainValidator.requireText;

public record AuditionContent(
        String externalId,
        String category,
        String title,
        String pay,
        String deadline,
        String sourceUrl
) {

    public AuditionContent {
        externalId = requireText(externalId, "공고 식별자가 필요합니다.");
        title = requireText(title, "공고 제목이 필요합니다.");
        sourceUrl = requireText(sourceUrl, "공고 원문 링크가 필요합니다.");
        category = optionalText(category);
        pay = optionalText(pay);
        deadline = optionalText(deadline);
    }

    private static String optionalText(String value) {
        return value == null ? "" : value.trim();
    }
}
