package art.yesulin.auth.application.admin;

import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;

public record MemberStatusResult(long memberId, MemberType type, MemberStatus status) {

    public static MemberStatusResult from(Member member) {
        return new MemberStatusResult(member.getId(), member.getType(), member.getStatus());
    }
}
