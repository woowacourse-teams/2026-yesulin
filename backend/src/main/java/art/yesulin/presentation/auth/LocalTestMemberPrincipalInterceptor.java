package art.yesulin.presentation.auth;

import art.yesulin.application.auth.MemberPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@Profile("local-test")
public class LocalTestMemberPrincipalInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (request.getSession().getAttribute(MemberPrincipal.SESSION_ATTRIBUTE) == null) {
            request.getSession().setAttribute(MemberPrincipal.SESSION_ATTRIBUTE, new MemberPrincipal(1L));
        }
        return true;
    }
}
