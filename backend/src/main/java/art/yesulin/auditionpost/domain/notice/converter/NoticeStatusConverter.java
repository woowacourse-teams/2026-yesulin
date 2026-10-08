package art.yesulin.auditionpost.domain.notice.converter;

import art.yesulin.auditionpost.domain.notice.NoticeStatus;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class NoticeStatusConverter extends StringEnumConverter<NoticeStatus> {

    public NoticeStatusConverter() {
        super(NoticeStatus.class);
    }
}
