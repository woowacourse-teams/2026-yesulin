package art.yesulin.actor.domain.cheer;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;

public enum ActorCheerErrorCode implements ErrorCode {

    ACTOR_PAGE_SELF_LIKE(ErrorType.FORBIDDEN),
    ACTOR_PAGE_SELF_CHEER(ErrorType.FORBIDDEN),
    ACTOR_CHEER_NOT_AUTHOR(ErrorType.FORBIDDEN),
    ACTOR_CHEER_NOT_FOUND(ErrorType.NOT_FOUND);

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
