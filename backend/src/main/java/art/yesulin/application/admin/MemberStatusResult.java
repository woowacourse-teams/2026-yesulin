package art.yesulin.application.admin;

import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;

public record MemberStatusResult(long memberId, MemberType type, MemberStatus status) {

    public static MemberStatusResult from(Member member) {
        return new MemberStatusResult(member.getId(), member.getType(), member.getStatus());
    }
}
