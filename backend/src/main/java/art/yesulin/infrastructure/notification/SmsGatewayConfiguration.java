package art.yesulin.infrastructure.notification;

import art.yesulin.application.auditionnotice.SmsGateway;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;

@Configuration(proxyBeanMethods = false)
public class SmsGatewayConfiguration {

    @Bean
    SmsGateway smsGateway(
            @Value("${yesulin.sms.provider:solapi}") String provider,
            @Value("${yesulin.sms.enabled:false}") boolean enabled,
            @Value("${yesulin.sms.solapi.api-key:}") String solapiKey,
            @Value("${yesulin.sms.solapi.api-secret:}") String solapiSecret,
            @Value("${yesulin.sms.aligo.user-id:}") String aligoUser,
            @Value("${yesulin.sms.aligo.api-key:}") String aligoKey,
            ObjectMapper mapper
    ) {
        boolean solapiEnabled = enabled && (provider.equals("solapi")
                || (!solapiKey.isBlank() && !solapiSecret.isBlank()));
        boolean aligoEnabled = enabled && (provider.equals("aligo")
                || (!aligoUser.isBlank() && !aligoKey.isBlank()));
        return new RoutingSmsGateway(provider, Map.of(
                "solapi", new SolapiSmsGateway(solapiKey, solapiSecret, solapiEnabled, mapper),
                "aligo", new AligoSmsGateway(aligoUser, aligoKey, aligoEnabled, mapper)
        ));
    }
}
