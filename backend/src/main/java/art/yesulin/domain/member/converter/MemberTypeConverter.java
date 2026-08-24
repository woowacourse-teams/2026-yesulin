package art.yesulin.domain.member.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.domain.member.MemberType;
import jakarta.persistence.Converter;

@Converter
public class MemberTypeConverter extends StringEnumConverter<MemberType> {

    public MemberTypeConverter() {
        super(MemberType.class);
    }
}
