package art.yesulin.dormant.domain.screening.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.dormant.domain.screening.ScreeningReviewStatus;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ScreeningReviewStatusConverter extends StringEnumConverter<ScreeningReviewStatus> {

    public ScreeningReviewStatusConverter() {
        super(ScreeningReviewStatus.class);
    }
}
