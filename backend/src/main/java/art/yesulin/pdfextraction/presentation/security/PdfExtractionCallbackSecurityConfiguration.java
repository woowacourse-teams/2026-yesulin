package art.yesulin.pdfextraction.presentation.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;

/** 프론트 세션·CSRF와 무관하게 서버 간 callback 경로 전체를 Bearer secret으로만 보호한다. */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfExtractionCallbackSecurityConfiguration {

    private static final Logger LOGGER = LoggerFactory.getLogger(PdfExtractionCallbackSecurityConfiguration.class);

    @Bean
    @Order(0)
    public SecurityFilterChain pdfExtractionCallbackSecurityFilterChain(
            HttpSecurity http,
            @Value("${yesulin.pdf-extraction.callback-secret:}") String secret
    ) throws Exception {
        if (!PdfExtractionCallbackBearerFilter.isUsable(secret)) {
            LOGGER.warn("PDF 추출 callback secret이 없거나 {}자 미만이므로 callback 요청을 모두 거부합니다.",
                    PdfExtractionCallbackBearerFilter.MIN_SECRET_LENGTH);
        }
        http.securityMatcher("/internal/v1/pdf-extractions/**")
                .authorizeHttpRequests(authorize -> authorize.anyRequest()
                        .hasRole(PdfExtractionCallbackBearerFilter.WORKER_ROLE))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(cache -> cache.disable())
                .anonymous(anonymous -> anonymous.disable())
                .addFilterBefore(new PdfExtractionCallbackBearerFilter(secret), AuthorizationFilter.class);
        return http.build();
    }
}
