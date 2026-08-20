package art.yesulin.domain.audition.form.converter;

import art.yesulin.domain.audition.form.BasicInformationField;
import art.yesulin.domain.common.converter.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class BasicInformationFieldConverter extends StringEnumConverter<BasicInformationField> {

    public BasicInformationFieldConverter() {
        super(BasicInformationField.class);
    }
}
