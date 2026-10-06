package art.yesulin.legacy.domain.submission.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.legacy.domain.submission.SubmissionAdditionalInformationField;
import jakarta.persistence.Converter;

@Converter
public class SubmissionAdditionalInformationFieldConverter
        extends StringEnumConverter<SubmissionAdditionalInformationField> {

    public SubmissionAdditionalInformationFieldConverter() {
        super(SubmissionAdditionalInformationField.class);
    }
}
