package art.yesulin.dormant.domain.submission.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.dormant.domain.submission.SubmissionBasicInformationField;
import jakarta.persistence.Converter;

@Converter
public class SubmissionBasicInformationFieldConverter
        extends StringEnumConverter<SubmissionBasicInformationField> {

    public SubmissionBasicInformationFieldConverter() {
        super(SubmissionBasicInformationField.class);
    }
}
