package art.yesulin.infrastructure.auth;

import art.yesulin.application.auth.PasswordResetSettings;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(PasswordResetProperties.class)
public class PasswordResetConfiguration {

    @Bean
    public PasswordResetSettings passwordResetSettings(PasswordResetProperties properties) {
        return new PasswordResetSettings(properties.expiration(), properties.url());
    }
}
