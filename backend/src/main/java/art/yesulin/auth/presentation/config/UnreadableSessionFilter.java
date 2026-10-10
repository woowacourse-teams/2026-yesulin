package art.yesulin.auth.presentation.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Collections;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.core.convert.ConversionFailedException;
import org.springframework.session.web.http.SessionRepositoryFilter;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * DB에 저장된 세션 속성 중 하나라도 역직렬화할 수 없으면 세션을 무효화하고 비로그인 요청으로 넘긴다.
 * 세션 저장 형식이 바뀌면 배포 전에 저장된 세션을 읽지 못해, 쿠키가 남아 있는 동안
 * 로그인·로그인 확인·소셜 로그인 콜백 요청이 계속 실패하기 때문이다.
 * Spring Session이 요청을 감싼 직후, Spring Security와 컨트롤러가 세션을 읽기 전에 실행한다.
 */
@Component
@Order(SessionRepositoryFilter.DEFAULT_ORDER + 1)
public class UnreadableSessionFilter extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(UnreadableSessionFilter.class);

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        if (session != null && !readable(session)) {
            // 무효화는 속성을 역직렬화하지 않고 세션 행을 지우며, 응답에서 세션 쿠키도 만료시킨다.
            session.invalidate();
            LOGGER.atWarn()
                    .addKeyValue("event", "UNREADABLE_SESSION_INVALIDATED")
                    .log("역직렬화할 수 없는 세션을 무효화했습니다.");
        }
        filterChain.doFilter(request, response);
    }

    /** Spring Session은 속성을 처음 읽을 때 역직렬화하고 결과를 기억하므로 이후 조회에 비용이 더 들지 않는다. */
    private boolean readable(HttpSession session) {
        try {
            Collections.list(session.getAttributeNames()).forEach(session::getAttribute);
            return true;
        } catch (ConversionFailedException exception) {
            return false;
        }
    }
}
