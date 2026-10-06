package art.yesulin.legacy.domain.submission.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.legacy.domain.submission.SubmissionConsentType;
import jakarta.persistence.Converter;

@Converter
public class SubmissionConsentTypeConverter extends StringEnumConverter<SubmissionConsentType> {

    public SubmissionConsentTypeConverter() {
        super(SubmissionConsentType.class);
    }
}
