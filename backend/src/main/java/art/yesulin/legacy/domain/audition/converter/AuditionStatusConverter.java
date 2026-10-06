package art.yesulin.legacy.domain.audition.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.legacy.domain.audition.AuditionStatus;
import jakarta.persistence.Converter;

@Converter
public class AuditionStatusConverter extends StringEnumConverter<AuditionStatus> {

    public AuditionStatusConverter() {
        super(AuditionStatus.class);
    }
}
