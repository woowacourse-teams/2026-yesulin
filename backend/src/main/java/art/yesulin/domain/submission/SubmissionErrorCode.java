package art.yesulin.domain.submission;

import art.yesulin.common.exception.ErrorCode;
import art.yesulin.common.exception.ErrorType;

public enum SubmissionErrorCode implements ErrorCode {

    INVALID_SUBMISSION("SUBMISSION_INVALID", ErrorType.BAD_REQUEST),
    INVALID_SELECTED_ROLE("SUBMISSION_INVALID_SELECTED_ROLE", ErrorType.BAD_REQUEST),
    INVALID_FORM_ANSWER("SUBMISSION_INVALID_FORM_ANSWER", ErrorType.BAD_REQUEST),
    INVALID_CONSENT("SUBMISSION_INVALID_CONSENT", ErrorType.BAD_REQUEST),
    RECRUITMENT_CLOSED("RECRUITMENT_CLOSED", ErrorType.CONFLICT);

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
