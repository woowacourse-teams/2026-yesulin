package art.yesulin.legacy.domain.audition.role.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.legacy.domain.audition.role.RoleGender;
import jakarta.persistence.Converter;

@Converter
public class RoleGenderConverter extends StringEnumConverter<RoleGender> {

    public RoleGenderConverter() {
        super(RoleGender.class);
    }
}
