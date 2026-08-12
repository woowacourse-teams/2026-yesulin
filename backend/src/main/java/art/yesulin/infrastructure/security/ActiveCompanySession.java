package art.yesulin.infrastructure.security;

import art.yesulin.application.company.ActiveCompanyAccessException;
import jakarta.servlet.http.HttpSession;

public final class ActiveCompanySession {

    public static final String ATTRIBUTE_NAME = "activeCompanyId";

    private ActiveCompanySession() {
    }

    public static Long find(HttpSession session) {
        Object value = session.getAttribute(ATTRIBUTE_NAME);
        return value instanceof Long companyId ? companyId : null;
    }

    public static long require(HttpSession session) {
        Long companyId = find(session);
        if (companyId == null) {
            throw new ActiveCompanyAccessException("활성 공연사를 먼저 선택해야 합니다.");
        }
        return companyId;
    }

    public static void select(HttpSession session, long companyId) {
        session.setAttribute(ATTRIBUTE_NAME, companyId);
    }
}
