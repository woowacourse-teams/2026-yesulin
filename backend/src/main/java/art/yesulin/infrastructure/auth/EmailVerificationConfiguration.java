package art.yesulin.infrastructure.auth;

import art.yesulin.application.auth.EmailVerificationSettings;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(EmailVerificationProperties.class)
public class EmailVerificationConfiguration {

    @Bean
    public EmailVerificationSettings emailVerificationSettings(EmailVerificationProperties properties) {
        return new EmailVerificationSettings(properties.expiration(), properties.url());
    }
}
