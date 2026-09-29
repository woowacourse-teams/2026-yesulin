package art.yesulin.domain.show.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.domain.show.ShowStatus;
import jakarta.persistence.Converter;

@Converter
public class ShowStatusConverter extends StringEnumConverter<ShowStatus> {

    public ShowStatusConverter() {
        super(ShowStatus.class);
    }
}
