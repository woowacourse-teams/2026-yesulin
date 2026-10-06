package art.yesulin.legacy.domain.submission.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.legacy.domain.submission.MilitaryServiceStatus;
import jakarta.persistence.Converter;

@Converter
public class MilitaryServiceStatusConverter extends StringEnumConverter<MilitaryServiceStatus> {

    public MilitaryServiceStatusConverter() {
        super(MilitaryServiceStatus.class);
    }
}
