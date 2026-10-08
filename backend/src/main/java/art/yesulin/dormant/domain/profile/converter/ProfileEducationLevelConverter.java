package art.yesulin.dormant.domain.profile.converter;

import art.yesulin.dormant.domain.profile.ProfileEducationLevel;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class ProfileEducationLevelConverter extends StringEnumConverter<ProfileEducationLevel> {

    public ProfileEducationLevelConverter() {
        super(ProfileEducationLevel.class);
    }
}
