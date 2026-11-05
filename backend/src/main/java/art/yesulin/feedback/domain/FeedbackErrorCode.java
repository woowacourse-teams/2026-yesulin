package art.yesulin.feedback.domain;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;

public enum FeedbackErrorCode implements ErrorCode {

    TOO_FREQUENT(ErrorType.TOO_MANY_REQUESTS);

    private final ErrorType type;

    FeedbackErrorCode(ErrorType type) {
        this.type = type;
    }

    @Override
    public String code() {
        return "FEEDBACK_" + name();
    }

    @Override
    public ErrorType type() {
        return type;
    }
}
