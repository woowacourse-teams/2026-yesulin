package art.yesulin.presentation.api.session;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.presentation.api.auth.AuthRole;

public record SessionResponse(long memberId, AuthRole role) {

    public static SessionResponse from(MemberPrincipal principal) {
        return new SessionResponse(principal.memberId(), principal.role());
    }
}
