package art.yesulin.dormant.domain.submission.converter;

import art.yesulin.dormant.domain.submission.SubmissionBasicInformationField;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class SubmissionBasicInformationFieldConverter
        extends StringEnumConverter<SubmissionBasicInformationField> {

    public SubmissionBasicInformationFieldConverter() {
        super(SubmissionBasicInformationField.class);
    }
}
