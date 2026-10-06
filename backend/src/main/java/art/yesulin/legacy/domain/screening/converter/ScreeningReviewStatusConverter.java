package art.yesulin.legacy.domain.screening.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.legacy.domain.screening.ScreeningReviewStatus;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ScreeningReviewStatusConverter extends StringEnumConverter<ScreeningReviewStatus> {

    public ScreeningReviewStatusConverter() {
        super(ScreeningReviewStatus.class);
    }
}
