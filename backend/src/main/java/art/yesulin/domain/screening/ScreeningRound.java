package art.yesulin.domain.screening;

import static art.yesulin.domain.screening.ScreeningReviewErrorCode.INVALID_REVIEW;

import art.yesulin.common.exception.BusinessException;

public record ScreeningRound(int value) {

    private static final int MIN_VALUE = 1;
    private static final int MAX_VALUE = 5;

    public ScreeningRound {
        if (value < MIN_VALUE || value > MAX_VALUE) {
            throw new BusinessException(INVALID_REVIEW, "전형 차수는 1 이상 5 이하여야 합니다.");
        }
    }

    public int stageOrder() {
        return value - 1;
    }
}
