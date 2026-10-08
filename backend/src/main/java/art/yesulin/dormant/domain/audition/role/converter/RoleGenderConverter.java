package art.yesulin.dormant.domain.audition.role.converter;

import art.yesulin.dormant.domain.audition.role.RoleGender;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class RoleGenderConverter extends StringEnumConverter<RoleGender> {

    public RoleGenderConverter() {
        super(RoleGender.class);
    }
}
