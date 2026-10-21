package art.yesulin.event.domain;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;

public enum EventErrorCode implements ErrorCode {

    INVALID_INPUT("EVENT_INVALID_INPUT", ErrorType.BAD_REQUEST),
    NOT_FOUND("EVENT_NOT_FOUND", ErrorType.NOT_FOUND);

    private final String code;
    private final ErrorType type;

    EventErrorCode(String code, ErrorType type) {
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
