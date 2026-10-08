package art.yesulin.dormant.domain.submission.converter;

import art.yesulin.dormant.domain.submission.SubmissionEducationLevel;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class SubmissionEducationLevelConverter extends StringEnumConverter<SubmissionEducationLevel> {

    public SubmissionEducationLevelConverter() {
        super(SubmissionEducationLevel.class);
    }
}
