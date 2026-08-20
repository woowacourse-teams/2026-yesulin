package art.yesulin.presentation.api.auth;

import art.yesulin.application.auth.AuthErrorCode;
import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.common.exception.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

public class LoginRequiredInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        boolean required = handlerMethod.hasMethodAnnotation(LoginRequired.class) || handlerMethod.getBeanType()
                .isAnnotationPresent(LoginRequired.class);
        if (!required) {
            return true;
        }

        HttpSession session = request.getSession(false);
        Object principal = (session == null) ? null : session.getAttribute(MemberPrincipal.SESSION_ATTRIBUTE);
        if (principal == null) {
            throw new BusinessException(AuthErrorCode.UNAUTHENTICATED, "로그인이 필요합니다.");
        }

        return true;
    }
}
