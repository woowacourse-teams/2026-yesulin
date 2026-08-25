package art.yesulin.domain.performance;

import art.yesulin.common.exception.ErrorCode;
import art.yesulin.common.exception.ErrorType;

public enum PerformanceErrorCode implements ErrorCode {

    NOT_FOUND("PERFORMANCE_NOT_FOUND", ErrorType.NOT_FOUND),
    ROLE_NOT_FOUND("PERFORMANCE_ROLE_NOT_FOUND", ErrorType.NOT_FOUND),
    ROLE_MODIFICATION_NOT_ALLOWED("PERFORMANCE_ROLE_MODIFICATION_NOT_ALLOWED", ErrorType.BAD_REQUEST),
    INVALID_ROLE_DESCRIPTION("PERFORMANCE_INVALID_ROLE_DESCRIPTION", ErrorType.BAD_REQUEST),
    DUPLICATE_ROLE_NAME("PERFORMANCE_DUPLICATE_ROLE_NAME", ErrorType.BAD_REQUEST);

    private final String code;
    private final ErrorType type;

    PerformanceErrorCode(String code, ErrorType type) {
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
