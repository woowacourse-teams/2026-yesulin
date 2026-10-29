package art.yesulin.infrastructure.ai;

import java.time.Duration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.awscore.retry.AwsRetryStrategy;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;

/** 재시도는 호출한 기능의 작업 큐가 소유하므로 SDK 재시도는 끈다. */
public final class BedrockRuntimeClients {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(30);
    private static final Duration ATTEMPT_TIMEOUT = Duration.ofSeconds(30);
    private static final Duration TOTAL_TIMEOUT = Duration.ofSeconds(35);

    private BedrockRuntimeClients() {
    }

    public static BedrockRuntimeClient create(String region) {
        return BedrockRuntimeClient.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.builder().build())
                .httpClientBuilder(UrlConnectionHttpClient.builder()
                        .connectionTimeout(CONNECT_TIMEOUT)
                        .socketTimeout(READ_TIMEOUT))
                .overrideConfiguration(ClientOverrideConfiguration.builder()
                        .apiCallAttemptTimeout(ATTEMPT_TIMEOUT)
                        .apiCallTimeout(TOTAL_TIMEOUT)
                        .retryStrategy(AwsRetryStrategy.doNotRetry())
                        .build())
                .build();
    }
}
