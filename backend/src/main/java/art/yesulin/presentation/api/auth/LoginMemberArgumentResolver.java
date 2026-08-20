package art.yesulin.presentation.api.auth;

import art.yesulin.application.auth.AuthErrorCode;
import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.common.exception.BusinessException;
import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

public class LoginMemberArgumentResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(LoginMember.class)
                && parameter.getParameterType().equals(MemberPrincipal.class);
    }

    @Override
    public Object resolveArgument(
            MethodParameter parameter,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            WebDataBinderFactory binderFactory
    ) {
        Object principal = webRequest.getAttribute(
                MemberPrincipal.SESSION_ATTRIBUTE, RequestAttributes.SCOPE_SESSION);

        if (principal == null) {
            throw new BusinessException(AuthErrorCode.UNAUTHENTICATED, "로그인이 필요합니다.");
        }

        return principal;
    }
}
