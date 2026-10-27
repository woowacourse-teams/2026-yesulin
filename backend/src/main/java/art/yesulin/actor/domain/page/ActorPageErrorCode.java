package art.yesulin.actor.domain.page;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;

public enum ActorPageErrorCode implements ErrorCode {

    ACTOR_HANDLE_INVALID(ErrorType.BAD_REQUEST),
    ACTOR_HANDLE_RESERVED(ErrorType.BAD_REQUEST),
    ACTOR_HANDLE_TAKEN(ErrorType.CONFLICT),
    ACTOR_HANDLE_LOCKED(ErrorType.CONFLICT),
    ACTOR_PAGE_CONSENT_REQUIRED(ErrorType.BAD_REQUEST),
    ACTOR_PAGE_LOCKED(ErrorType.CONFLICT),
    ACTOR_PAGE_NOT_READY(ErrorType.CONFLICT),
    ACTOR_PAGE_CONFLICT(ErrorType.CONFLICT);

    private final ErrorType type;

    ActorPageErrorCode(ErrorType type) {
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
