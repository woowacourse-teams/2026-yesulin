package art.yesulin.domain.member;

import art.yesulin.common.exception.ErrorCode;
import art.yesulin.common.exception.ErrorType;

public enum MemberErrorCode implements ErrorCode {

    MEMBER_NOT_FOUND("MEMBER_NOT_FOUND", ErrorType.NOT_FOUND),
    STATUS_CHANGE_NOT_ALLOWED("MEMBER_STATUS_CHANGE_NOT_ALLOWED", ErrorType.CONFLICT);

    private final String code;
    private final ErrorType type;

    MemberErrorCode(String code, ErrorType type) {
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
