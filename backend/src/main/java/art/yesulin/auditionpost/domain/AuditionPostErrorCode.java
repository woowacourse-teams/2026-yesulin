package art.yesulin.auditionpost.domain;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;

public enum AuditionPostErrorCode implements ErrorCode {

    INVALID_INPUT("AUDITION_POST_INVALID_INPUT", ErrorType.BAD_REQUEST),
    CATEGORY_NOT_SUPPORTED("AUDITION_POST_CATEGORY_NOT_SUPPORTED", ErrorType.CONFLICT),
    NOT_FOUND("AUDITION_POST_NOT_FOUND", ErrorType.NOT_FOUND),
    SOURCE_UNAVAILABLE("AUDITION_POST_SOURCE_UNAVAILABLE", ErrorType.CONFLICT),
    FILE_REJECTED("AUDITION_POST_FILE_REJECTED", ErrorType.CONFLICT),
    IMPORT_CONFLICT("AUDITION_POST_IMPORT_CONFLICT", ErrorType.CONFLICT);

    private final String code;
    private final ErrorType type;

    AuditionPostErrorCode(String code, ErrorType type) {
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
