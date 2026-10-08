package art.yesulin.timetable.domain.converter;

import art.yesulin.global.persistence.StringEnumConverter;
import art.yesulin.timetable.domain.message.TimetableMessageStatus;
import jakarta.persistence.Converter;

@Converter
public class TimetableMessageStatusConverter extends StringEnumConverter<TimetableMessageStatus> {

    public TimetableMessageStatusConverter() {
        super(TimetableMessageStatus.class);
    }
}
