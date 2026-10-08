package art.yesulin.dormant.domain.screening.converter;

import art.yesulin.dormant.domain.screening.ScreeningReviewStatus;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ScreeningReviewStatusConverter extends StringEnumConverter<ScreeningReviewStatus> {

    public ScreeningReviewStatusConverter() {
        super(ScreeningReviewStatus.class);
    }
}
