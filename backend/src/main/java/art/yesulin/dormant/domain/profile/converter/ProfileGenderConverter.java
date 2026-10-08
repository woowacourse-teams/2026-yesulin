package art.yesulin.dormant.domain.profile.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.dormant.domain.profile.ProfileGender;
import jakarta.persistence.Converter;

@Converter
public class ProfileGenderConverter extends StringEnumConverter<ProfileGender> {

    public ProfileGenderConverter() {
        super(ProfileGender.class);
    }
}
