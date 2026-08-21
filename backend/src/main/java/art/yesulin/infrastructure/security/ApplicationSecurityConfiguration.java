package art.yesulin.infrastructure.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

/**
 * 소셜 로그인 경로 밖의 요청을 담당하는 체인이다.
 * 인증과 인가는 LoginRequiredInterceptor와 LoginMemberArgumentResolver가 담당하므로
 * Spring Security는 쓰기 요청의 CSRF 검증만 맡는다.
 * CSRF 토큰은 클라이언트가 읽어 헤더로 되돌려야 하므로 HttpOnly가 아닌 쿠키로 내려준다.
 */
@Configuration
public class ApplicationSecurityConfiguration {

    private static final String CSRF_HEADER_NAME = "X-CSRF-Token";

    @Bean
    @Order(2)
    public SecurityFilterChain applicationSecurityFilterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll())
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository())
                        .csrfTokenRequestHandler(csrfTokenRequestHandler()))
                .securityContext(context -> context.disable())
                .requestCache(cache -> cache.disable())
                .anonymous(anonymous -> anonymous.disable())
                .exceptionHandling(handling -> handling.disable());
        return http.build();
    }

    private CookieCsrfTokenRepository csrfTokenRepository() {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setHeaderName(CSRF_HEADER_NAME);
        return repository;
    }

    private CsrfTokenRequestAttributeHandler csrfTokenRequestHandler() {
        CsrfTokenRequestAttributeHandler handler = new CsrfTokenRequestAttributeHandler();
        handler.setCsrfRequestAttributeName(null);
        return handler;
    }
}
