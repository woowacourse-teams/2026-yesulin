package art.yesulin.dormant.domain.submission.converter;

import art.yesulin.dormant.domain.submission.MilitaryServiceStatus;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class MilitaryServiceStatusConverter extends StringEnumConverter<MilitaryServiceStatus> {

    public MilitaryServiceStatusConverter() {
        super(MilitaryServiceStatus.class);
    }
}
