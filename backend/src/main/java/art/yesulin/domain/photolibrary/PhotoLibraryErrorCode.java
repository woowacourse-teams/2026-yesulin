package art.yesulin.domain.photolibrary;

import art.yesulin.common.exception.ErrorCode;
import art.yesulin.common.exception.ErrorType;

public enum PhotoLibraryErrorCode implements ErrorCode {

    PHOTO_NOT_FOUND("PHOTO_LIBRARY_PHOTO_NOT_FOUND", ErrorType.NOT_FOUND),
    LIMIT_EXCEEDED("PHOTO_LIBRARY_LIMIT_EXCEEDED", ErrorType.CONFLICT),
    INVALID_DISPLAY_ORDER("PHOTO_LIBRARY_INVALID_DISPLAY_ORDER", ErrorType.BAD_REQUEST);

    private final String code;
    private final ErrorType type;

    PhotoLibraryErrorCode(String code, ErrorType type) {
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
