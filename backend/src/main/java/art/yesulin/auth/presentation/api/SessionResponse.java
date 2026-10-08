package art.yesulin.auth.presentation.api;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;

public record SessionResponse(long memberId, MemberType role, MemberStatus status) {

    public static SessionResponse from(MemberPrincipal principal) {
        return new SessionResponse(principal.memberId(), principal.role(), principal.status());
    }
}
