package art.yesulin.domain.file;

import art.yesulin.common.exception.ErrorCode;
import art.yesulin.common.exception.ErrorType;

public enum FileErrorCode implements ErrorCode {

    NOT_FOUND("FILE_NOT_FOUND", ErrorType.NOT_FOUND),
    UNSUPPORTED_CONTENT_TYPE("FILE_UNSUPPORTED_CONTENT_TYPE", ErrorType.BAD_REQUEST),
    UPLOAD_NOT_FOUND("FILE_UPLOAD_NOT_FOUND", ErrorType.CONFLICT),
    METADATA_MISMATCH("FILE_METADATA_MISMATCH", ErrorType.CONFLICT);

    private final String code;
    private final ErrorType type;

    FileErrorCode(String code, ErrorType type) {
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
