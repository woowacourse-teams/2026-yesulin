package art.yesulin.dormant.domain.audition.form.converter;

import art.yesulin.dormant.domain.audition.form.BasicInformationField;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class BasicInformationFieldConverter extends StringEnumConverter<BasicInformationField> {

    public BasicInformationFieldConverter() {
        super(BasicInformationField.class);
    }
}
