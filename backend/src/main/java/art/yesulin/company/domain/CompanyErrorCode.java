package art.yesulin.company.domain;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;

public enum CompanyErrorCode implements ErrorCode {

    INVALID_INPUT("COMPANY_INVALID_INPUT", ErrorType.BAD_REQUEST),
    NOT_FOUND("COMPANY_NOT_FOUND", ErrorType.NOT_FOUND);

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
