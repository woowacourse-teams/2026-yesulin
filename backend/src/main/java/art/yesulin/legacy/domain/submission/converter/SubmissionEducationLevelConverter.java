package art.yesulin.legacy.domain.submission.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.legacy.domain.submission.SubmissionEducationLevel;
import jakarta.persistence.Converter;

@Converter
public class SubmissionEducationLevelConverter extends StringEnumConverter<SubmissionEducationLevel> {

    public SubmissionEducationLevelConverter() {
        super(SubmissionEducationLevel.class);
    }
}
