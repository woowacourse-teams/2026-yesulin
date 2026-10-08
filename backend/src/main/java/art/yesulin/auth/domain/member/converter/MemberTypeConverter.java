package art.yesulin.auth.domain.member.converter;

import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class MemberTypeConverter extends StringEnumConverter<MemberType> {

    public MemberTypeConverter() {
        super(MemberType.class);
    }
}
