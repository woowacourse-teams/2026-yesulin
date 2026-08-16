package art.yesulin.common.exception;

public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public BusinessException(ErrorCode errorCode, String message, Object... arguments) {
        this(errorCode, message.formatted(arguments));
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }
}
