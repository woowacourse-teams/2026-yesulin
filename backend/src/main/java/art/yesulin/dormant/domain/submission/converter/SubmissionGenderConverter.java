package art.yesulin.dormant.domain.submission.converter;

import art.yesulin.dormant.domain.submission.SubmissionGender;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class SubmissionGenderConverter extends StringEnumConverter<SubmissionGender> {

    public SubmissionGenderConverter() {
        super(SubmissionGender.class);
    }
}
