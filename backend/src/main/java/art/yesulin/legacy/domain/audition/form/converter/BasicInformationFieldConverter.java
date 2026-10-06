package art.yesulin.legacy.domain.audition.form.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.legacy.domain.audition.form.BasicInformationField;
import jakarta.persistence.Converter;

@Converter
public class BasicInformationFieldConverter extends StringEnumConverter<BasicInformationField> {

    public BasicInformationFieldConverter() {
        super(BasicInformationField.class);
    }
}
