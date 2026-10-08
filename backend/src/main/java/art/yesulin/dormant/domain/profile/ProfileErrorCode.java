package art.yesulin.dormant.domain.profile;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;

public enum ProfileErrorCode implements ErrorCode {

    INVALID_PROFILE("PROFILE_INVALID", ErrorType.BAD_REQUEST);

    private final String code;
    private final ErrorType type;

    ProfileErrorCode(String code, ErrorType type) {
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
