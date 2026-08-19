package art.yesulin.domain.audition;

import art.yesulin.common.exception.ErrorCode;
import art.yesulin.common.exception.ErrorType;

public enum AuditionErrorCode implements ErrorCode {

    NOT_FOUND("AUDITION_NOT_FOUND", ErrorType.NOT_FOUND),
    INVALID_BASIC_INFORMATION("AUDITION_INVALID_BASIC_INFORMATION", ErrorType.BAD_REQUEST);

    private final String code;
    private final ErrorType type;

    AuditionErrorCode(String code, ErrorType type) {
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
