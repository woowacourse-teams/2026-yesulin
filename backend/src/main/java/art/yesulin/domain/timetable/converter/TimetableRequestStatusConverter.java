package art.yesulin.domain.timetable.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.domain.timetable.TimetableRequestStatus;
import jakarta.persistence.Converter;

@Converter
public class TimetableRequestStatusConverter extends StringEnumConverter<TimetableRequestStatus> {

    public TimetableRequestStatusConverter() {
        super(TimetableRequestStatus.class);
    }
}
