package art.yesulin.domain.timetable.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.domain.timetable.message.TimetableMessageType;
import jakarta.persistence.Converter;

@Converter
public class TimetableMessageTypeConverter extends StringEnumConverter<TimetableMessageType> {

    public TimetableMessageTypeConverter() {
        super(TimetableMessageType.class);
    }
}
