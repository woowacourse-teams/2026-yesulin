package art.yesulin.actor.domain.bookmark;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;

public enum ProducerActorBookmarkErrorCode implements ErrorCode {

    ACTOR_BOOKMARK_LIMIT_EXCEEDED(ErrorType.CONFLICT);

    private final ErrorType type;

    ProducerActorBookmarkErrorCode(ErrorType type) {
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
