package art.yesulin.application.auth;

public record MemberPrincipal(long memberId) {

    public static final String SESSION_ATTRIBUTE = "memberPrincipal";

    public MemberPrincipal {
        if (memberId < 1) {
            throw new IllegalArgumentException("회원 ID는 1 이상이어야 합니다.");
        }
    }
}
