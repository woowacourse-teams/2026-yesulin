package art.yesulin.domain.producer;

import art.yesulin.common.exception.ErrorCode;
import art.yesulin.common.exception.ErrorType;

public enum ProducerErrorCode implements ErrorCode {

    INVALID_COMPANY_NAME("PRODUCER_INVALID_COMPANY_NAME", ErrorType.BAD_REQUEST),
    INVALID_PHONE("PRODUCER_INVALID_PHONE", ErrorType.BAD_REQUEST),
    DUPLICATE_EMAIL("PRODUCER_DUPLICATE_EMAIL", ErrorType.CONFLICT);

    private final String code;
    private final ErrorType type;

    ProducerErrorCode(String code, ErrorType type) {
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
