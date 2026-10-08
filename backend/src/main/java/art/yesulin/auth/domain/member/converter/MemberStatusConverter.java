package art.yesulin.auth.domain.member.converter;

import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class MemberStatusConverter extends StringEnumConverter<MemberStatus> {

    public MemberStatusConverter() {
        super(MemberStatus.class);
    }
}
