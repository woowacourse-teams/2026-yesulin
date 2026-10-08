package art.yesulin.timetable.domain;

import art.yesulin.global.exception.ErrorCode;
import art.yesulin.global.exception.ErrorType;

public enum TimetableErrorCode implements ErrorCode {

    NOT_FOUND("TIMETABLE_NOT_FOUND", ErrorType.NOT_FOUND),
    INVALID_INPUT("TIMETABLE_INVALID_INPUT", ErrorType.BAD_REQUEST),
    ACTOR_NOT_FOUND("TIMETABLE_ACTOR_NOT_FOUND", ErrorType.NOT_FOUND),
    DUPLICATE_ACTOR("TIMETABLE_DUPLICATE_ACTOR", ErrorType.CONFLICT),
    TOO_MANY_ACTORS("TIMETABLE_TOO_MANY_ACTORS", ErrorType.CONFLICT),
    SLOT_UNAVAILABLE("TIMETABLE_SLOT_UNAVAILABLE", ErrorType.CONFLICT),
    ASSIGNMENT_CONFLICT("TIMETABLE_ASSIGNMENT_CONFLICT", ErrorType.CONFLICT),
    NOT_PUBLISHABLE("TIMETABLE_NOT_PUBLISHABLE", ErrorType.CONFLICT),
    SELF_CHANGE_CLOSED("TIMETABLE_SELF_CHANGE_CLOSED", ErrorType.CONFLICT),
    SETTING_NOT_EXTENDABLE("TIMETABLE_SETTING_NOT_EXTENDABLE", ErrorType.CONFLICT),
    REQUEST_NOT_FOUND("TIMETABLE_REQUEST_NOT_FOUND", ErrorType.NOT_FOUND),
    MESSAGE_NOT_FOUND("TIMETABLE_MESSAGE_NOT_FOUND", ErrorType.NOT_FOUND);

    private final String code;
    private final ErrorType type;

    TimetableErrorCode(String code, ErrorType type) {
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
