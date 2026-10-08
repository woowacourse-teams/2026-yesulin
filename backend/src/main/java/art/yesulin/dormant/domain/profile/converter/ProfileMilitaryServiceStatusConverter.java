package art.yesulin.dormant.domain.profile.converter;

import art.yesulin.dormant.domain.profile.ProfileMilitaryServiceStatus;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class ProfileMilitaryServiceStatusConverter extends StringEnumConverter<ProfileMilitaryServiceStatus> {

    public ProfileMilitaryServiceStatusConverter() {
        super(ProfileMilitaryServiceStatus.class);
    }
}
