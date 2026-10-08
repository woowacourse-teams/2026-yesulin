package art.yesulin.show.domain.converter;

import art.yesulin.global.persistence.StringEnumConverter;
import art.yesulin.show.domain.ShowGenre;
import jakarta.persistence.Converter;

@Converter
public class ShowGenreConverter extends StringEnumConverter<ShowGenre> {

    public ShowGenreConverter() {
        super(ShowGenre.class);
    }
}
