package art.yesulin.presentation.session;

public record SessionResponse(
        boolean authenticated,
        Long accountId,
        String email,
        Long activeCompanyId,
        String csrfToken) {

    public static SessionResponse anonymous(String csrfToken) {
        return new SessionResponse(false, null, null, null, csrfToken);
    }

    public static SessionResponse authenticated(
            long accountId, String email, Long activeCompanyId, String csrfToken) {
        return new SessionResponse(true, accountId, email, activeCompanyId, csrfToken);
    }
}
