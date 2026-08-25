package art.yesulin.domain.producer;

import art.yesulin.common.exception.ErrorCode;
import art.yesulin.common.exception.ErrorType;

public enum ProducerErrorCode implements ErrorCode {

    INVALID_COMPANY_NAME("PRODUCER_INVALID_COMPANY_NAME", ErrorType.BAD_REQUEST),
    INVALID_CONTACT_NAME("PRODUCER_INVALID_CONTACT_NAME", ErrorType.BAD_REQUEST),
    INVALID_CONTACT_ROLE("PRODUCER_INVALID_CONTACT_ROLE", ErrorType.BAD_REQUEST),
    INVALID_DESCRIPTION("PRODUCER_INVALID_DESCRIPTION", ErrorType.BAD_REQUEST),
    INVALID_UPDATE("PRODUCER_INVALID_UPDATE", ErrorType.BAD_REQUEST),
    INVALID_PHONE("PRODUCER_INVALID_PHONE", ErrorType.BAD_REQUEST),
    DUPLICATE_EMAIL("PRODUCER_DUPLICATE_EMAIL", ErrorType.CONFLICT),
    PRODUCER_NOT_FOUND("PRODUCER_NOT_FOUND", ErrorType.NOT_FOUND);

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
