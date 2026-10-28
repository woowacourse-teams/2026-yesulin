package art.yesulin.actor.domain.profileimport;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;

public enum ProfileImportErrorCode implements ErrorCode {

    PROFILE_IMPORT_NOT_FOUND(ErrorType.NOT_FOUND),
    PROFILE_IMPORT_IN_PROGRESS(ErrorType.CONFLICT),
    PROFILE_IMPORT_DAILY_LIMIT(ErrorType.CONFLICT),
    PROFILE_IMPORT_NOT_FINISHED(ErrorType.CONFLICT),
    PROFILE_IMPORT_PHOTO_NOT_FOUND(ErrorType.NOT_FOUND);

    private final ErrorType type;

    ProfileImportErrorCode(ErrorType type) {
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
