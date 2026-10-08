package art.yesulin.auth.application.admin;

import art.yesulin.auth.domain.member.MemberStatus;

public record ChangeMemberStatusCommand(long actorMemberId, long targetMemberId, MemberStatus status) {
}
