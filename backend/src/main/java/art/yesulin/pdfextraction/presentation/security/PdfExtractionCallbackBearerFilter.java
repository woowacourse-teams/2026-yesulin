package art.yesulin.pdfextraction.presentation.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Collections;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class PdfExtractionCallbackBearerFilter extends OncePerRequestFilter {

    public static final String WORKER_ROLE = "PDF_EXTRACTION_WORKER";
    public static final int MIN_SECRET_LENGTH = 32;

    private static final String BEARER_PREFIX = "Bearer ";

    private final byte[] expectedDigest;

    public PdfExtractionCallbackBearerFilter(String secret) {
        this.expectedDigest = isUsable(secret) ? sha256(secret) : null;
    }

    public static boolean isUsable(String secret) {
        return secret != null && secret.length() >= MIN_SECRET_LENGTH
                && secret.chars().noneMatch(Character::isWhitespace);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!hasValidToken(request)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
            response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
            return;
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated("pdf-extraction-worker", null,
                List.of(new SimpleGrantedAuthority("ROLE_" + WORKER_ROLE))));
        SecurityContextHolder.setContext(context);
        chain.doFilter(request, response);
    }

    private boolean hasValidToken(HttpServletRequest request) {
        List<String> headers = Collections.list(request.getHeaders(HttpHeaders.AUTHORIZATION));
        if (expectedDigest == null || headers.size() != 1) {
            return false;
        }
        String header = headers.get(0);
        if (!header.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            return false;
        }
        byte[] presented = sha256(header.substring(BEARER_PREFIX.length()));
        return MessageDigest.isEqual(expectedDigest, presented);
    }

    private static byte[] sha256(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
        }
    }
}
