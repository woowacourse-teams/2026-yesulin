package art.yesulin.dormant.domain.profile.converter;

import art.yesulin.dormant.domain.profile.ProfileGender;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class ProfileGenderConverter extends StringEnumConverter<ProfileGender> {

    public ProfileGenderConverter() {
        super(ProfileGender.class);
    }
}
