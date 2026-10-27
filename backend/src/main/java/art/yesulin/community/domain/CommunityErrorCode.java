package art.yesulin.community.domain;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;

public enum CommunityErrorCode implements ErrorCode {

    NOT_FOUND(ErrorType.NOT_FOUND),
    NOT_OWNER(ErrorType.FORBIDDEN),
    REQUEST_CONFLICT(ErrorType.CONFLICT);

    private final ErrorType type;

    CommunityErrorCode(ErrorType type) {
        this.type = type;
    }

    @Override
    public String code() {
        return "COMMUNITY_" + name();
    }

    @Override
    public ErrorType type() {
        return type;
    }
}
