package art.yesulin.application.admin;

import art.yesulin.domain.member.MemberStatus;

public record ChangeMemberStatusCommand(long actorMemberId, long targetMemberId, MemberStatus status) {
}
