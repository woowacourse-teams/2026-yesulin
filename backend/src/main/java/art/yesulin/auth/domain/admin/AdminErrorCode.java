package art.yesulin.auth.domain.admin;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;

public enum AdminErrorCode implements ErrorCode {

    DELETION_CONFIRMATION_FAILED("ADMIN_DELETION_CONFIRMATION_FAILED", ErrorType.FORBIDDEN);

    private final String code;
    private final ErrorType type;

    AdminErrorCode(String code, ErrorType type) {
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
