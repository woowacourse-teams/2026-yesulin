package art.yesulin.domain.videolibrary;

import art.yesulin.common.exception.ErrorCode;
import art.yesulin.common.exception.ErrorType;

public enum VideoLibraryErrorCode implements ErrorCode {

    VIDEO_NOT_FOUND("VIDEO_LIBRARY_VIDEO_NOT_FOUND", ErrorType.NOT_FOUND),
    LIMIT_EXCEEDED("VIDEO_LIBRARY_LIMIT_EXCEEDED", ErrorType.CONFLICT),
    DUPLICATE_VIDEO("VIDEO_LIBRARY_DUPLICATE_VIDEO", ErrorType.CONFLICT),
    INVALID_VIDEO_URL("VIDEO_LIBRARY_INVALID_URL", ErrorType.BAD_REQUEST),
    INVALID_DISPLAY_ORDER("VIDEO_LIBRARY_INVALID_DISPLAY_ORDER", ErrorType.BAD_REQUEST);

    private final String code;
    private final ErrorType type;

    VideoLibraryErrorCode(String code, ErrorType type) {
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
