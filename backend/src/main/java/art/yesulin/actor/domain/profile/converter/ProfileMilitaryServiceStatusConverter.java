package art.yesulin.actor.domain.profile.converter;

import art.yesulin.actor.domain.profile.ProfileMilitaryServiceStatus;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class ProfileMilitaryServiceStatusConverter extends StringEnumConverter<ProfileMilitaryServiceStatus> {

    public ProfileMilitaryServiceStatusConverter() {
        super(ProfileMilitaryServiceStatus.class);
    }
}
