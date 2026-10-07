package art.yesulin.domain.show;

import art.yesulin.common.exception.ErrorCode;
import art.yesulin.common.exception.ErrorType;

public enum ShowErrorCode implements ErrorCode {

    NOT_FOUND("SHOW_NOT_FOUND", ErrorType.NOT_FOUND),
    SESSION_NOT_FOUND("SHOW_SESSION_NOT_FOUND", ErrorType.NOT_FOUND),
    INVALID_INPUT("SHOW_INVALID_INPUT", ErrorType.BAD_REQUEST),
    INVALID_STATUS("SHOW_INVALID_STATUS", ErrorType.CONFLICT),
    NOT_OPENABLE("SHOW_NOT_OPENABLE", ErrorType.CONFLICT),
    NOT_OPEN("SHOW_NOT_OPEN", ErrorType.CONFLICT),
    EXTERNAL_RESERVATION("SHOW_EXTERNAL_RESERVATION", ErrorType.CONFLICT),
    HAS_RESERVATIONS("SHOW_HAS_RESERVATIONS", ErrorType.CONFLICT),
    SESSION_BOOKING_CLOSED("SHOW_SESSION_BOOKING_CLOSED", ErrorType.CONFLICT),
    SESSION_NOT_ENOUGH_SEATS("SHOW_SESSION_NOT_ENOUGH_SEATS", ErrorType.CONFLICT),
    SESSION_CAPACITY_BELOW_RESERVED("SHOW_SESSION_CAPACITY_BELOW_RESERVED", ErrorType.CONFLICT),
    SESSION_HAS_RESERVATIONS("SHOW_SESSION_HAS_RESERVATIONS", ErrorType.CONFLICT);

    private final String code;
    private final ErrorType type;

    ShowErrorCode(String code, ErrorType type) {
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
