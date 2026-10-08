package art.yesulin.timetable.domain.converter;

import art.yesulin.global.persistence.StringEnumConverter;
import art.yesulin.timetable.domain.TimetableStatus;
import jakarta.persistence.Converter;

@Converter
public class TimetableStatusConverter extends StringEnumConverter<TimetableStatus> {

    public TimetableStatusConverter() {
        super(TimetableStatus.class);
    }
}
