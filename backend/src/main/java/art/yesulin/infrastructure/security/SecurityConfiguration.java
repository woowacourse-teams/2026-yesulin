package art.yesulin.infrastructure.security;

import art.yesulin.infrastructure.account.AccountJpaRepository;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

@Configuration
public class SecurityConfiguration {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        CookieCsrfTokenRepository csrfRepository = new CookieCsrfTokenRepository();
        csrfRepository.setHeaderName("X-CSRF-Token");
        csrfRepository.setCookieCustomizer(cookie -> cookie.httpOnly(false).sameSite("Lax"));
        http.csrf(csrf -> csrf.csrfTokenRepository(csrfRepository))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/v1/applicants", "/api/v1/producers")
                        .permitAll()
                        .requestMatchers("/api/v1/sessions", "/api/v1/sessions/current")
                        .permitAll()
                        .requestMatchers("/api/v1/public/**")
                        .permitAll()
                        .anyRequest()
                        .authenticated())
                .formLogin(login -> login.disable())
                .httpBasic(basic -> basic.disable())
                .logout(logout -> logout.disable());
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration)
            throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    SessionPrincipalResolver sessionPrincipalResolver(AccountJpaRepository accountRepository) {
        return new SessionPrincipalResolver(accountRepository);
    }
}
