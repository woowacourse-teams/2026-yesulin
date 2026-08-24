package art.yesulin.domain.profile.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.domain.profile.ProfileMilitaryServiceStatus;
import jakarta.persistence.Converter;

@Converter
public class ProfileMilitaryServiceStatusConverter extends StringEnumConverter<ProfileMilitaryServiceStatus> {

    public ProfileMilitaryServiceStatusConverter() {
        super(ProfileMilitaryServiceStatus.class);
    }
}
