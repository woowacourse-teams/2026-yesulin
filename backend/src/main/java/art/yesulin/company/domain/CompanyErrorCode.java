package art.yesulin.company.domain;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;

public enum CompanyErrorCode implements ErrorCode {

    INVALID_INPUT("COMPANY_INVALID_INPUT", ErrorType.BAD_REQUEST),
    NOT_FOUND("COMPANY_NOT_FOUND", ErrorType.NOT_FOUND),
    EDIT_REQUEST_NOT_FOUND("COMPANY_EDIT_REQUEST_NOT_FOUND", ErrorType.NOT_FOUND),
    EDIT_REQUEST_RESOLVED("COMPANY_EDIT_REQUEST_RESOLVED", ErrorType.CONFLICT);

    private final String code;
    private final ErrorType type;

    CompanyErrorCode(String code, ErrorType type) {
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
