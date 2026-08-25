package art.yesulin.domain.screening;

import art.yesulin.common.exception.ErrorCode;
import art.yesulin.common.exception.ErrorType;

public enum ScreeningReviewErrorCode implements ErrorCode {

    NOT_FOUND("SCREENING_REVIEW_NOT_FOUND", ErrorType.NOT_FOUND),
    INVALID_REVIEW("INVALID_SCREENING_REVIEW", ErrorType.BAD_REQUEST),
    ROUND_NOT_READY("SCREENING_ROUND_NOT_READY", ErrorType.CONFLICT);

    private final String code;
    private final ErrorType type;

    ScreeningReviewErrorCode(String code, ErrorType type) {
        this.code = code;
        this.type = type;
    }

    @Override
    public String code() {
        return code;
    }

    @Override
    public ErrorType type() {
        return type;
    }
}
