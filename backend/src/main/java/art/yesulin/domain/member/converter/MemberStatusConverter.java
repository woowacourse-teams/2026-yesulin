package art.yesulin.domain.member.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.domain.member.MemberStatus;
import jakarta.persistence.Converter;

@Converter
public class MemberStatusConverter extends StringEnumConverter<MemberStatus> {

    public MemberStatusConverter() {
        super(MemberStatus.class);
    }
}
