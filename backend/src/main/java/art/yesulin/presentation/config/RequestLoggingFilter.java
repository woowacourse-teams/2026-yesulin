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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {

    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    public static final String REQUEST_ID_MDC_KEY = "requestId";

    private static final Logger LOGGER = LoggerFactory.getLogger(RequestLoggingFilter.class);
    private static final String HEALTH_CHECK_URI = "/api/v1/health";
    /**
     * 짧은 주기로 반복 호출돼 정작 필요한 로그를 밀어내는 경로다.
     * 성공 요청은 DEBUG로 낮추고 실패는 그대로 남긴다.
     */
    private static final Set<String> POLLING_URIS = Set.of(HEALTH_CHECK_URI, "/api/v1/admin/logs");
    private static final Pattern REQUEST_ID_PATTERN = Pattern.compile("[A-Za-z0-9._-]{1,64}");

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String requestId = resolveRequestId(request.getHeader(REQUEST_ID_HEADER));
        long startNanos = System.nanoTime();
        Throwable failure = null;

        MDC.put(REQUEST_ID_MDC_KEY, requestId);
        response.setHeader(REQUEST_ID_HEADER, requestId);
        try {
            filterChain.doFilter(request, response);
        } catch (IOException | ServletException exception) {
            failure = exception;
            throw exception;
        } catch (RuntimeException | Error exception) {
            failure = exception;
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
        long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
        int status = resolveStatus(response, failure);
        if (failure != null) {
            logFailedRequest(request, status, elapsedMillis);
            return;
        }
        if (isPolling(request)) {
            logPolling(request, status, elapsedMillis);
            return;
        }
        if (status >= HttpServletResponse.SC_INTERNAL_SERVER_ERROR) {
            LOGGER.error(
                    "HTTP method={} uri={} status={} elapsedMs={}",
                    request.getMethod(),
                    request.getRequestURI(),
                    status,
                    elapsedMillis
            );
            return;
        }
        LOGGER.info(
                "HTTP method={} uri={} status={} elapsedMs={}",
                request.getMethod(),
                request.getRequestURI(),
                status,
                elapsedMillis
        );
    }

    private void logFailedRequest(
            HttpServletRequest request,
            int status,
            long elapsedMillis
    ) {
        LOGGER.error(
                "HTTP method={} uri={} status={} elapsedMs={}",
                request.getMethod(),
                request.getRequestURI(),
                status,
                elapsedMillis
        );
    }

    private boolean isPolling(HttpServletRequest request) {
        return POLLING_URIS.contains(request.getRequestURI());
    }

    /**
     * 성공은 DEBUG로 낮추고 서버 오류만 ERROR로 올린다.
     * 로그인 전 401처럼 흔히 생기는 응답까지 ERROR로 남기면 실제 장애를 가린다.
     */
    private void logPolling(HttpServletRequest request, int status, long elapsedMillis) {
        if (status == HttpServletResponse.SC_OK) {
            LOGGER.debug(
                    "HTTP method={} uri={} status={} elapsedMs={}",
                    request.getMethod(),
                    request.getRequestURI(),
                    status,
                    elapsedMillis
            );
            return;
        }
        if (status < HttpServletResponse.SC_INTERNAL_SERVER_ERROR) {
            LOGGER.info(
                    "HTTP method={} uri={} status={} elapsedMs={}",
                    request.getMethod(),
                    request.getRequestURI(),
                    status,
                    elapsedMillis
            );
            return;
        }
        LOGGER.error(
                "HTTP method={} uri={} status={} elapsedMs={}",
                request.getMethod(),
                request.getRequestURI(),
                status,
                elapsedMillis
        );
    }

    private int resolveStatus(HttpServletResponse response, Throwable failure) {
        if (failure != null && response.getStatus() < HttpServletResponse.SC_INTERNAL_SERVER_ERROR) {
            return HttpServletResponse.SC_INTERNAL_SERVER_ERROR;
        }
        return response.getStatus();
    }
}
