package art.yesulin.domain.screening;

import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.screening.ScreeningReviewErrorCode.INVALID_REVIEW;

import art.yesulin.common.exception.BusinessException;
import java.util.Locale;

public enum ScreeningReviewStatus {

    PENDING,
    PASS,
    FAIL,
    ABSENT,
    ETC;

    public static ScreeningReviewStatus from(String value) {
        String normalizedValue = requireText(value, "심사 상태는 필수입니다.").toUpperCase(Locale.ROOT);
        try {
            return valueOf(normalizedValue);
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(INVALID_REVIEW, "지원하지 않는 심사 상태입니다.");
        }
    }
}
