package art.yesulin.domain.notice.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.domain.notice.NoticeStatus;
import jakarta.persistence.Converter;

@Converter
public class NoticeStatusConverter extends StringEnumConverter<NoticeStatus> {

    public NoticeStatusConverter() {
        super(NoticeStatus.class);
    }
}
