package art.yesulin.actor.domain.cheer;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;

public enum ActorCheerErrorCode implements ErrorCode {

    ACTOR_PAGE_SELF_LIKE(ErrorType.FORBIDDEN);

    private final ErrorType type;

    ActorCheerErrorCode(ErrorType type) {
        this.type = type;
    }

    @Override
    public String code() {
        return name();
    }

    @Override
    public ErrorType type() {
        return type;
    }
}
