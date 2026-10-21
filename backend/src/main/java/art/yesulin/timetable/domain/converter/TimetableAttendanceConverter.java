package art.yesulin.timetable.domain.converter;

import art.yesulin.global.persistence.StringEnumConverter;
import art.yesulin.timetable.domain.actor.TimetableAttendance;
import jakarta.persistence.Converter;

@Converter
public class TimetableAttendanceConverter extends StringEnumConverter<TimetableAttendance> {

    public TimetableAttendanceConverter() {
        super(TimetableAttendance.class);
    }
}
