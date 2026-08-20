package art.yesulin.application.auth;

import art.yesulin.common.exception.ErrorCode;
import art.yesulin.common.exception.ErrorType;

public enum AuthErrorCode implements ErrorCode {

    UNAUTHENTICATED("AUTH_UNAUTHENTICATED", ErrorType.UNAUTHORIZED);

    private final String code;
    private final ErrorType type;

    AuthErrorCode(String code, ErrorType type) {
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
