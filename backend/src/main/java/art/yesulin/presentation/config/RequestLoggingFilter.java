package art.yesulin.presentation.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.slf4j.spi.LoggingEventBuilder;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class RequestLoggingFilter extends OncePerRequestFilter {

    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    public static final String REQUEST_ID_MDC_KEY = "requestId";

    private static final Logger LOGGER = LoggerFactory.getLogger(RequestLoggingFilter.class);
    private static final String API_HEALTH_CHECK_URI = "/api/v1/health";
    private static final String READINESS_CHECK_URI = "/actuator/health/readiness";
    /**
     * 짧은 주기로 반복 호출돼 정작 필요한 로그를 밀어내는 경로다.
     * 성공 요청은 DEBUG로 낮추고 실패는 그대로 남긴다.
     */
    private static final Set<String> POLLING_URIS = Set.of(
            API_HEALTH_CHECK_URI,
            READINESS_CHECK_URI,
            "/api/v1/admin/logs"
    );
    private static final Pattern REQUEST_ID_PATTERN = Pattern.compile("[A-Za-z0-9._-]{1,64}");
    private static final long SLOW_REQUEST_MILLIS = 1_000L;

    private final MonotonicTimeSource timeSource;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String requestId = resolveRequestId(request.getHeader(REQUEST_ID_HEADER));
        long startNanos = timeSource.nanoTime();
        Throwable failure = null;

        MDC.put(REQUEST_ID_MDC_KEY, requestId);
        response.setHeader(REQUEST_ID_HEADER, requestId);
        try {
            filterChain.doFilter(request, response);
        } catch (IOException | ServletException exception) {
            failure = exception;
            logUnexpectedException(request, exception);
            throw exception;
        } catch (RuntimeException | Error exception) {
            failure = exception;
            logUnexpectedException(request, exception);
            throw exception;
        } finally {
            logRequest(request, response, failure, startNanos);
            MDC.remove(REQUEST_ID_MDC_KEY);
        }
    }

    private String resolveRequestId(String candidate) {
        if (candidate != null && REQUEST_ID_PATTERN.matcher(candidate).matches()) {
            return candidate;
        }
        return UUID.randomUUID().toString();
    }

    private void logRequest(
            HttpServletRequest request,
            HttpServletResponse response,
            Throwable failure,
            long startNanos
    ) {
        long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(timeSource.nanoTime() - startNanos);
        int status = resolveStatus(response, failure);
        String endpoint = RequestLogContext.resolveEndpoint(request);
        String errorCode = RequestLogContext.getErrorCode(request);
        LoggingEventBuilder event = requestLogBuilder(request, status, elapsedMillis)
                .addKeyValue("event", "HTTP_REQUEST")
                .addKeyValue("method", request.getMethod())
                .addKeyValue("uri", request.getRequestURI())
                .addKeyValue("endpoint", endpoint)
                .addKeyValue("status", status)
                .addKeyValue("elapsedMs", elapsedMillis);
        if (errorCode != null) {
            event.addKeyValue("errorCode", errorCode);
        }
        event.log(
                "HTTP method={} uri={} endpoint={} status={} elapsedMs={}",
                request.getMethod(),
                request.getRequestURI(),
                endpoint,
                status,
                elapsedMillis
        );
    }

    private boolean isPolling(HttpServletRequest request) {
        return POLLING_URIS.contains(request.getRequestURI());
    }

    private LoggingEventBuilder requestLogBuilder(HttpServletRequest request, int status, long elapsedMillis) {
        if (status >= HttpServletResponse.SC_INTERNAL_SERVER_ERROR) {
            return LOGGER.atError();
        }
        if (elapsedMillis >= SLOW_REQUEST_MILLIS) {
            return LOGGER.atWarn();
        }
        if (isPolling(request) && status == HttpServletResponse.SC_OK) {
            return LOGGER.atDebug();
        }
        return LOGGER.atInfo();
    }

    private void logUnexpectedException(HttpServletRequest request, Throwable exception) {
        RequestLogContext.setErrorCode(request, RequestLogContext.INTERNAL_ERROR_CODE);
        String endpoint = RequestLogContext.resolveEndpoint(request);
        LOGGER.atError()
                .addKeyValue("event", "UNEXPECTED_ERROR")
                .addKeyValue("method", request.getMethod())
                .addKeyValue("uri", request.getRequestURI())
                .addKeyValue("endpoint", endpoint)
                .addKeyValue("errorCode", RequestLogContext.INTERNAL_ERROR_CODE)
                .addKeyValue("exception", exception.getClass().getSimpleName())
                .setCause(exception)
                .log("예상하지 못한 요청 처리 오류가 발생했습니다.");
    }

    private int resolveStatus(HttpServletResponse response, Throwable failure) {
        if (failure != null && response.getStatus() < HttpServletResponse.SC_INTERNAL_SERVER_ERROR) {
            return HttpServletResponse.SC_INTERNAL_SERVER_ERROR;
        }
        return response.getStatus();
    }
}
