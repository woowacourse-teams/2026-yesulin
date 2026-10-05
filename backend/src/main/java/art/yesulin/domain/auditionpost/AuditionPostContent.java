package art.yesulin.domain.auditionpost;

import static art.yesulin.domain.auditionpost.AuditionPostErrorCode.CATEGORY_NOT_SUPPORTED;
import static art.yesulin.domain.auditionpost.AuditionPostErrorCode.INVALID_INPUT;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.regex.Pattern;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 원문에서 읽은 공고 내용. 분류는 {@link AuditionCategory}의 다섯 가지만 받는다. 페이·마감은 {@code 협의}, {@code 상시}처럼 원문 표현을 그대로 보존하고,
 * 마감이 {@code yyyy-MM-dd} 형식일 때만 날짜로도 저장해 마감 여부를 계산한다.
 * 본문은 출처 adapter가 허용 태그만 남긴 HTML이다.
 */
@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditionPostContent {

    public static final int MAX_TITLE_LENGTH = 300;
    public static final int MAX_BODY_LENGTH = 500_000;
    private static final int MAX_CATEGORY_LENGTH = 50;
    private static final int MAX_PAY_LENGTH = 200;
    private static final int MAX_DEADLINE_LENGTH = 50;
    private static final int MAX_AUTHOR_LENGTH = 100;
    private static final Pattern ISO_DATE = Pattern.compile("[0-9]{4}-[0-9]{2}-[0-9]{2}");

    @Column(nullable = false, length = MAX_CATEGORY_LENGTH)
    private String category;

    @Column(nullable = false, length = MAX_TITLE_LENGTH)
    private String title;

    @Column(nullable = false, length = MAX_PAY_LENGTH)
    private String pay;

    @Column(name = "deadline_text", nullable = false, length = MAX_DEADLINE_LENGTH)
    private String deadlineText;

    @Column(name = "deadline")
    private LocalDate deadline;

    @Column(name = "author_name", nullable = false, length = MAX_AUTHOR_LENGTH)
    private String authorName;

    @Column(name = "source_posted_at")
    private LocalDateTime sourcePostedAt;

    @Column(name = "body_html", nullable = false, columnDefinition = "mediumtext")
    private String bodyHtml;

    public AuditionPostContent(
            String category,
            String title,
            String pay,
            String deadlineText,
            String authorName,
            LocalDateTime sourcePostedAt,
            String bodyHtml
    ) {
        this.title = requiredText(title, MAX_TITLE_LENGTH, "공고 제목은 1~%d자여야 합니다.".formatted(MAX_TITLE_LENGTH));
        if (!AuditionCategory.supports(category)) {
            throw new BusinessException(
                    CATEGORY_NOT_SUPPORTED, "%s 공고만 올릴 수 있습니다. 이 공고의 분류: %s",
                    AuditionCategory.labels(), category == null || category.isBlank() ? "없음" : category.trim()
            );
        }
        this.category = category.trim();
        this.pay = optionalText(pay, MAX_PAY_LENGTH, "페이");
        this.deadlineText = optionalText(deadlineText, MAX_DEADLINE_LENGTH, "마감");
        this.deadline = parseDeadline(this.deadlineText);
        this.authorName = optionalText(authorName, MAX_AUTHOR_LENGTH, "작성자");
        this.sourcePostedAt = sourcePostedAt;
        if (bodyHtml == null || bodyHtml.length() > MAX_BODY_LENGTH) {
            throw invalid("공고 본문은 %d자 이하여야 합니다.".formatted(MAX_BODY_LENGTH));
        }
        this.bodyHtml = bodyHtml;
    }

    /** 날짜 마감은 당일까지 모집 중이다. 날짜가 아닌 마감(상시·채용 시 마감 등)은 모집 중으로 본다. */
    public boolean isClosedOn(LocalDate date) {
        return deadline != null && date.isAfter(deadline);
    }

    private static LocalDate parseDeadline(String text) {
        if (!ISO_DATE.matcher(text).matches()) {
            return null;
        }
        try {
            return LocalDate.parse(text);
        } catch (DateTimeParseException exception) {
            return null;
        }
    }

    private static String requiredText(String value, int maxLength, String message) {
        if (value == null || value.isBlank() || value.trim().length() > maxLength) {
            throw invalid(message);
        }
        return value.trim();
    }

    private static String optionalText(String value, int maxLength, String label) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.length() > maxLength) {
            throw invalid("%s은(는) %d자 이하여야 합니다.".formatted(label, maxLength));
        }
        return trimmed;
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(INVALID_INPUT, message);
    }
}
