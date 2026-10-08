package art.yesulin.global.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.servlet.HandlerMapping;

/** 예외 처리기와 최종 요청 로그가 공유하는 request 범위의 안전한 진단 정보다. */
public final class RequestLogContext {

    public static final String INTERNAL_ERROR_CODE = "INTERNAL_ERROR";

    private static final String ERROR_CODE_ATTRIBUTE = RequestLogContext.class.getName() + ".errorCode";
    private static final String OTR_ID_ATTRIBUTE = RequestLogContext.class.getName() + ".otrId";

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

    public static void setOtrId(HttpServletRequest request, String otrId) {
        request.setAttribute(OTR_ID_ATTRIBUTE, otrId);
    }

    public static String getOtrId(HttpServletRequest request) {
        Object otrId = request.getAttribute(OTR_ID_ATTRIBUTE);
        return otrId instanceof String value ? value : null;
    }
}
