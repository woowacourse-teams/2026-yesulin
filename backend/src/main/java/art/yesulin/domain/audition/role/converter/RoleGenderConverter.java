package art.yesulin.domain.audition.role.converter;

import art.yesulin.domain.audition.role.RoleGender;
import art.yesulin.domain.common.converter.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class RoleGenderConverter extends StringEnumConverter<RoleGender> {

    public RoleGenderConverter() {
        super(RoleGender.class);
    }
}
