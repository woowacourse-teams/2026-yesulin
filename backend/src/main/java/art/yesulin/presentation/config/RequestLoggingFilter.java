package art.yesulin.presentation.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
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
            logFailedRequest(request, status, elapsedMillis, failure);
            return;
        }
        if (isHealthCheck(request)) {
            logHealthCheck(request, status, elapsedMillis);
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
            long elapsedMillis,
            Throwable failure
    ) {
        LOGGER.error(
                "HTTP method={} uri={} status={} elapsedMs={} exception={} origin={}",
                request.getMethod(),
                request.getRequestURI(),
                status,
                elapsedMillis,
                failure.getClass().getSimpleName(),
                resolveOrigin(failure)
        );
    }

    private boolean isHealthCheck(HttpServletRequest request) {
        return HEALTH_CHECK_URI.equals(request.getRequestURI());
    }

    private void logHealthCheck(HttpServletRequest request, int status, long elapsedMillis) {
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
        LOGGER.error(
                "HTTP method={} uri={} status={} elapsedMs={}",
                request.getMethod(),
                request.getRequestURI(),
                status,
                elapsedMillis
        );
    }

    private String resolveOrigin(Throwable failure) {
        StackTraceElement[] stackTrace = failure.getStackTrace();
        if (stackTrace.length == 0) {
            return "unknown";
        }
        return stackTrace[0].toString();
    }

    private int resolveStatus(HttpServletResponse response, Throwable failure) {
        if (failure != null && response.getStatus() < HttpServletResponse.SC_INTERNAL_SERVER_ERROR) {
            return HttpServletResponse.SC_INTERNAL_SERVER_ERROR;
        }
        return response.getStatus();
    }
}
