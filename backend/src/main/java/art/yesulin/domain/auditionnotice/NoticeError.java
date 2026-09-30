package art.yesulin.domain.auditionnotice;

import art.yesulin.common.exception.ErrorCode;
import art.yesulin.common.exception.ErrorType;

public enum NoticeError implements ErrorCode {
    NOT_FOUND(ErrorType.NOT_FOUND),
    CONFLICT(ErrorType.CONFLICT),
    DISABLED(ErrorType.CONFLICT),
    LIMIT_EXCEEDED(ErrorType.CONFLICT);

    private final ErrorType type;

    NoticeError(ErrorType type) {
        this.type = type;
    }

    @Override
    public String code() {
        return "SMS_" + name();
    }

    @Override
    public ErrorType type() {
        return type;
    }
}
