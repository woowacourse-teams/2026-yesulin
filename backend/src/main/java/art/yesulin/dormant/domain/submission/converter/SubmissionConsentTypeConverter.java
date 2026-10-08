package art.yesulin.dormant.domain.submission.converter;

import art.yesulin.dormant.domain.submission.SubmissionConsentType;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class SubmissionConsentTypeConverter extends StringEnumConverter<SubmissionConsentType> {

    public SubmissionConsentTypeConverter() {
        super(SubmissionConsentType.class);
    }
}
