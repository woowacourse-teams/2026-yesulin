package art.yesulin.timetable.domain.converter;

import art.yesulin.global.persistence.StringEnumConverter;
import art.yesulin.timetable.domain.request.TimetableRequestStatus;
import jakarta.persistence.Converter;

@Converter
public class TimetableRequestStatusConverter extends StringEnumConverter<TimetableRequestStatus> {

    public TimetableRequestStatusConverter() {
        super(TimetableRequestStatus.class);
    }
}
