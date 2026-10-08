package art.yesulin.dormant.infrastructure.notification;

import static org.assertj.core.api.Assertions.assertThat;

import art.yesulin.dormant.application.auditionnotice.SmsGateway;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

class SmsGatewayConfigurationTest {

    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withUserConfiguration(SmsGatewayConfiguration.class)
            .withBean(ObjectMapper.class, () -> JsonMapper.builder().build());

    @Test
    void disabledDefaultsStartWithoutCredentials() {
        context.run(result -> {
            assertThat(result).hasSingleBean(SmsGateway.class);
            assertThat(result.getBean(SmsGateway.class).send("02", "010", "안내", "SMS").code())
                    .isEqualTo("DISABLED_NOT_SENT");
        });
    }

    @Test
    void enabledDefaultRequiresSolapiCredentials() {
        context.withPropertyValues("yesulin.sms.enabled=true")
                .run(result -> assertThat(result).hasFailed());
        context.withPropertyValues("yesulin.sms.enabled=true", "yesulin.sms.solapi.api-key=fake-key",
                        "yesulin.sms.solapi.api-secret=fake-secret")
                .run(result -> assertThat(result).hasSingleBean(SmsGateway.class));
    }

    @Test
    void aligoCanBeSelectedWithoutSolapiCredentials() {
        context.withPropertyValues("yesulin.sms.enabled=true", "yesulin.sms.provider=aligo",
                        "yesulin.sms.aligo.user-id=fake-user", "yesulin.sms.aligo.api-key=fake-key")
                .run(result -> assertThat(result).hasSingleBean(SmsGateway.class));
        context.withPropertyValues("yesulin.sms.enabled=true", "yesulin.sms.provider=aligo")
                .run(result -> assertThat(result).hasFailed());
    }

    @Test
    void unsupportedProviderFailsAtStartup() {
        context.withPropertyValues("yesulin.sms.provider=typo").run(result -> assertThat(result).hasFailed());
    }
}
