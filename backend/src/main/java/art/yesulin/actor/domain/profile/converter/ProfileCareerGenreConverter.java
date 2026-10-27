package art.yesulin.actor.domain.profile.converter;

import art.yesulin.actor.domain.profile.ProfileCareerGenre;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class ProfileCareerGenreConverter extends StringEnumConverter<ProfileCareerGenre> {

    public ProfileCareerGenreConverter() {
        super(ProfileCareerGenre.class);
    }
}
