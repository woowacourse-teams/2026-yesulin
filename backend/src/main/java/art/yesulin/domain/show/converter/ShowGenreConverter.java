package art.yesulin.domain.show.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.domain.show.ShowGenre;
import jakarta.persistence.Converter;

@Converter
public class ShowGenreConverter extends StringEnumConverter<ShowGenre> {

    public ShowGenreConverter() {
        super(ShowGenre.class);
    }
}
