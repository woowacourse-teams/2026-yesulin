package art.yesulin.presentation.api.admin;

import art.yesulin.application.admin.ChangeMemberStatusCommand;
import art.yesulin.domain.member.MemberStatus;
import jakarta.validation.constraints.NotNull;

public record ChangeMemberStatusRequest(@NotNull(message = "변경할 회원 상태가 필요합니다.") MemberStatus status) {

    public ChangeMemberStatusCommand toCommand(long actorMemberId, long targetMemberId) {
        return new ChangeMemberStatusCommand(actorMemberId, targetMemberId, status);
    }
}
