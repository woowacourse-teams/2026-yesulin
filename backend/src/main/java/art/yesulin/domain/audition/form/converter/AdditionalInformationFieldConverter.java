package art.yesulin.domain.audition.form.converter;

import art.yesulin.domain.audition.form.AdditionalInformationField;
import art.yesulin.domain.common.converter.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class AdditionalInformationFieldConverter extends StringEnumConverter<AdditionalInformationField> {

    public AdditionalInformationFieldConverter() {
        super(AdditionalInformationField.class);
    }
}
