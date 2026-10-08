package art.yesulin.auth.infrastructure;

import art.yesulin.auth.application.PasswordResetSettings;
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
