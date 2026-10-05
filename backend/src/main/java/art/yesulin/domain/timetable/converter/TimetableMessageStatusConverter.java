package art.yesulin.domain.timetable.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.domain.timetable.message.TimetableMessageStatus;
import jakarta.persistence.Converter;

@Converter
public class TimetableMessageStatusConverter extends StringEnumConverter<TimetableMessageStatus> {

    public TimetableMessageStatusConverter() {
        super(TimetableMessageStatus.class);
    }
}
