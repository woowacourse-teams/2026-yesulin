package art.yesulin.domain.screening;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.screening.ScreeningReviewErrorCode.INVALID_REVIEW;

import art.yesulin.common.exception.BusinessException;

public record ScreeningReviewChange(
        ScreeningReviewStatus status,
        String otherReason,
        String internalMemo
) {

    public ScreeningReviewChange {
        if (status == null && otherReason == null && internalMemo == null) {
            throw new BusinessException(INVALID_REVIEW, "변경할 심사 상태나 메모를 입력해 주세요.");
        }
        if (status != null && status != ScreeningReviewStatus.ETC && otherReason != null) {
            throw new BusinessException(INVALID_REVIEW, "기타 상태에서만 사유를 입력할 수 있습니다.");
        }
    }

    void applyTo(ScreeningReview review) {
        ScreeningReview target = requireNonNull(review, "변경할 심사 결과는 필수입니다.");
        if (status != null) {
            target.decide(status, otherReason);
        } else if (otherReason != null) {
            target.updateOtherReason(otherReason);
        }
        if (internalMemo != null) {
            target.updateInternalMemo(internalMemo);
        }
    }
}
