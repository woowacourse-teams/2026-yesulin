package art.yesulin.pdfextraction.infrastructure.ai;

import art.yesulin.infrastructure.ai.BedrockRuntimeClients;
import art.yesulin.pdfextraction.application.ai.PdfAiProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;

@Configuration(proxyBeanMethods = false)
@Profile("dev | prod")
@ConditionalOnExpression("${yesulin.pdf-ai.enabled:false} and '${yesulin.pdf-ai.provider:bedrock}' == 'bedrock'")
public class PdfAiClientConfiguration {

    @Bean(destroyMethod = "close")
    public BedrockRuntimeClient bedrockRuntimeClient(PdfAiProperties properties) {
        return BedrockRuntimeClients.create(properties.region());
    }
}
