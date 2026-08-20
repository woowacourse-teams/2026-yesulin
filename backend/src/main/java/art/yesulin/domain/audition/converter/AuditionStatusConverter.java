package art.yesulin.domain.audition.converter;

import art.yesulin.domain.audition.AuditionStatus;
import art.yesulin.domain.common.converter.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class AuditionStatusConverter extends StringEnumConverter<AuditionStatus> {

    public AuditionStatusConverter() {
        super(AuditionStatus.class);
    }
}
