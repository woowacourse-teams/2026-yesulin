package art.yesulin.show.domain.converter;

import art.yesulin.global.persistence.StringEnumConverter;
import art.yesulin.show.domain.ShowStatus;
import jakarta.persistence.Converter;

@Converter
public class ShowStatusConverter extends StringEnumConverter<ShowStatus> {

    public ShowStatusConverter() {
        super(ShowStatus.class);
    }
}
