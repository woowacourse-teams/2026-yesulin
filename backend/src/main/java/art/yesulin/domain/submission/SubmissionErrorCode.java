package art.yesulin.domain.submission;

import art.yesulin.common.exception.ErrorCode;
import art.yesulin.common.exception.ErrorType;

public enum SubmissionErrorCode implements ErrorCode {

    INVALID_SUBMISSION("SUBMISSION_INVALID", ErrorType.BAD_REQUEST);

    private final String code;
    private final ErrorType type;

    SubmissionErrorCode(String code, ErrorType type) {
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
