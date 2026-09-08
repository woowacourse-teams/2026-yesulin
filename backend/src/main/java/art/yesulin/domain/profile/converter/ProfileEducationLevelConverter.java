package art.yesulin.domain.profile.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.domain.profile.ProfileEducationLevel;
import jakarta.persistence.Converter;

@Converter
public class ProfileEducationLevelConverter extends StringEnumConverter<ProfileEducationLevel> {

    public ProfileEducationLevelConverter() {
        super(ProfileEducationLevel.class);
    }
}
