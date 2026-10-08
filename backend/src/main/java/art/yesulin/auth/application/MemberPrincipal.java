package art.yesulin.auth.application;

import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import java.io.Serial;
import java.io.Serializable;

public record MemberPrincipal(long memberId, MemberType role, MemberStatus status) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    public static final String SESSION_ATTRIBUTE = "memberPrincipal";

    public MemberPrincipal {
        if (memberId < 1) {
            throw new IllegalArgumentException("회원 ID는 1 이상이어야 합니다.");
        }
    }

    public static MemberPrincipal from(Member member) {
        return new MemberPrincipal(member.getId(), member.getType(), member.getStatus());
    }
}
