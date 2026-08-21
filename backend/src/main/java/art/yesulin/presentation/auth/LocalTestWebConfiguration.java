package art.yesulin.presentation.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@Profile("local-test")
@RequiredArgsConstructor
public class LocalTestWebConfiguration implements WebMvcConfigurer {

    private final LocalTestMemberPrincipalInterceptor memberPrincipalInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(memberPrincipalInterceptor);
    }
}
