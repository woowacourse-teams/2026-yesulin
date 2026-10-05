package art.yesulin.domain.timetable.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.domain.timetable.TimetableStatus;
import jakarta.persistence.Converter;

@Converter
public class TimetableStatusConverter extends StringEnumConverter<TimetableStatus> {

    public TimetableStatusConverter() {
        super(TimetableStatus.class);
    }
}
