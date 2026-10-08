package art.yesulin.dormant.domain.audition.converter;

import art.yesulin.dormant.domain.audition.AuditionStatus;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class AuditionStatusConverter extends StringEnumConverter<AuditionStatus> {

    public AuditionStatusConverter() {
        super(AuditionStatus.class);
    }
}
