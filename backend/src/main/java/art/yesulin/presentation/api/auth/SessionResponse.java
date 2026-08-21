package art.yesulin.presentation.api.auth;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.member.MemberType;

public record SessionResponse(long memberId, MemberType role) {

    public static SessionResponse from(MemberPrincipal principal) {
        return new SessionResponse(principal.memberId(), principal.role());
    }
}
