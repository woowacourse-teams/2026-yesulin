package art.yesulin.domain.otraudition;

import art.yesulin.common.exception.ErrorCode;
import art.yesulin.common.exception.ErrorType;

public enum OtrAuditionErrorCode implements ErrorCode {

    INVALID_INPUT("OTR_AUDITION_INVALID_INPUT", ErrorType.BAD_REQUEST),
    DUPLICATE_OTR_ID("OTR_AUDITION_DUPLICATE_OTR_ID", ErrorType.CONFLICT),
    NOT_FOUND("OTR_AUDITION_NOT_FOUND", ErrorType.NOT_FOUND),
    CLOSED("OTR_AUDITION_CLOSED", ErrorType.CONFLICT),
    STALE_POSTING_SNAPSHOT("OTR_AUDITION_STALE_POSTING_SNAPSHOT", ErrorType.CONFLICT),
    DUPLICATE_SUBMISSION("OTR_AUDITION_DUPLICATE_SUBMISSION", ErrorType.CONFLICT);

    private final String code;
    private final ErrorType type;

    OtrAuditionErrorCode(String code, ErrorType type) {
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
