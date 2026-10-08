package art.yesulin.dormant.domain.submission.converter;

import art.yesulin.dormant.domain.submission.SubmissionAdditionalInformationField;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class SubmissionAdditionalInformationFieldConverter
        extends StringEnumConverter<SubmissionAdditionalInformationField> {

    public SubmissionAdditionalInformationFieldConverter() {
        super(SubmissionAdditionalInformationField.class);
    }
}
