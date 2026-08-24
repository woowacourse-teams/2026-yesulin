package art.yesulin.domain.submission.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.domain.submission.SubmissionGender;
import jakarta.persistence.Converter;

@Converter
public class SubmissionGenderConverter extends StringEnumConverter<SubmissionGender> {

    public SubmissionGenderConverter() {
        super(SubmissionGender.class);
    }
}
