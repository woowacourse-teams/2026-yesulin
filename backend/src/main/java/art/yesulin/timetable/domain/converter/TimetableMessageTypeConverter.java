package art.yesulin.timetable.domain.converter;

import art.yesulin.global.persistence.StringEnumConverter;
import art.yesulin.timetable.domain.message.TimetableMessageType;
import jakarta.persistence.Converter;

@Converter
public class TimetableMessageTypeConverter extends StringEnumConverter<TimetableMessageType> {

    public TimetableMessageTypeConverter() {
        super(TimetableMessageType.class);
    }
}
