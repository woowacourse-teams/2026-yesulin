package art.yesulin.presentation.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.servlet.HandlerMapping;

/** 예외 처리기와 최종 요청 로그가 공유하는 request 범위의 안전한 진단 정보다. */
public final class RequestLogContext {

    public static final String INTERNAL_ERROR_CODE = "INTERNAL_ERROR";

    private static final String ERROR_CODE_ATTRIBUTE = RequestLogContext.class.getName() + ".errorCode";

    private RequestLogContext() {
    }

    public static void setErrorCode(HttpServletRequest request, String errorCode) {
        request.setAttribute(ERROR_CODE_ATTRIBUTE, errorCode);
    }

    public static String getErrorCode(HttpServletRequest request) {
        Object errorCode = request.getAttribute(ERROR_CODE_ATTRIBUTE);
        return errorCode instanceof String value ? value : null;
    }

    public static String resolveEndpoint(HttpServletRequest request) {
        Object pattern = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        return pattern == null ? request.getRequestURI() : pattern.toString();
    }
}
