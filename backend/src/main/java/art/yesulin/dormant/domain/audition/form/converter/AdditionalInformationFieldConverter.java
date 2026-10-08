package art.yesulin.dormant.domain.audition.form.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.dormant.domain.audition.form.AdditionalInformationField;
import jakarta.persistence.Converter;

@Converter
public class AdditionalInformationFieldConverter extends StringEnumConverter<AdditionalInformationField> {

    public AdditionalInformationFieldConverter() {
        super(AdditionalInformationField.class);
    }
}
