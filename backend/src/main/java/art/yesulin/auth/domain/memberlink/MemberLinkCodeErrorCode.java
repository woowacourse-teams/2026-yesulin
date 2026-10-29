package art.yesulin.auth.domain.memberlink;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;

public enum MemberLinkCodeErrorCode implements ErrorCode {

    INVALID("MEMBER_LINK_CODE_INVALID", ErrorType.BAD_REQUEST),
    COOLDOWN("MEMBER_LINK_CODE_COOLDOWN", ErrorType.CONFLICT),
    ISSUE_RETRY("MEMBER_LINK_CODE_ISSUE_RETRY", ErrorType.CONFLICT);

    private final String code;
    private final ErrorType type;

    MemberLinkCodeErrorCode(String code, ErrorType type) {
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
