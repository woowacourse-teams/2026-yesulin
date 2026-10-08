package art.yesulin.show.domain.reservation;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;

public enum ReservationErrorCode implements ErrorCode {

    NOT_FOUND("RESERVATION_NOT_FOUND", ErrorType.NOT_FOUND),
    INVALID_INPUT("RESERVATION_INVALID_INPUT", ErrorType.BAD_REQUEST),
    DUPLICATE("RESERVATION_DUPLICATE", ErrorType.CONFLICT),
    NOT_CHANGEABLE("RESERVATION_NOT_CHANGEABLE", ErrorType.CONFLICT);

    private final String code;
    private final ErrorType type;

    ReservationErrorCode(String code, ErrorType type) {
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
