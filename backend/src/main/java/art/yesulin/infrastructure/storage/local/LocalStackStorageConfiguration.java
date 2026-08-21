package art.yesulin.infrastructure.storage.local;

import art.yesulin.application.file.storage.ObjectStorage;
import art.yesulin.infrastructure.storage.s3.S3ObjectStorage;
import art.yesulin.infrastructure.storage.s3.S3StorageProperties;
import java.net.URI;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.testcontainers.containers.localstack.LocalStackContainer;
import org.testcontainers.containers.localstack.LocalStackContainer.Service;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CORSConfiguration;
import software.amazon.awssdk.services.s3.model.CORSRule;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.PutBucketCorsRequest;
import software.amazon.awssdk.services.s3.model.PutBucketPolicyRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration(proxyBeanMethods = false)
@Profile("local-test")
@EnableConfigurationProperties(S3StorageProperties.class)
public class LocalStackStorageConfiguration {

    private static final DockerImageName LOCALSTACK_IMAGE = DockerImageName.parse("localstack/localstack:3.8.1");

    @Bean(destroyMethod = "stop")
    LocalStackContainer localStackContainer() {
        LocalStackContainer container = new LocalStackContainer(LOCALSTACK_IMAGE).withServices(Service.S3);
        container.start();
        return container;
    }

    @Bean
    S3Client localS3Client(LocalStackContainer container) {
        return S3Client.builder()
                .endpointOverride(container.getEndpoint())
                .credentialsProvider(credentials(container))
                .region(Region.of(container.getRegion()))
                .forcePathStyle(true)
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .build();
    }

    @Bean
    S3Presigner localS3Presigner(LocalStackContainer container) {
        return S3Presigner.builder()
                .endpointOverride(container.getEndpoint())
                .credentialsProvider(credentials(container))
                .region(Region.of(container.getRegion()))
                .build();
    }

    @Bean
    ObjectStorage localObjectStorage(
            LocalStackContainer container,
            S3Client s3Client,
            S3Presigner presigner,
            S3StorageProperties properties
    ) {
        configureBucket(s3Client, properties);
        String publicBaseUrl = "%s/%s/%s".formatted(
                container.getEndpoint(), properties.bucket(), properties.keyPrefix()
        );
        S3StorageProperties localProperties = new S3StorageProperties(
                properties.bucket(), properties.keyPrefix(), URI.create(publicBaseUrl),
                container.getRegion(), properties.uploadExpiration()
        );
        return new S3ObjectStorage(s3Client, presigner, localProperties);
    }

    private StaticCredentialsProvider credentials(LocalStackContainer container) {
        return StaticCredentialsProvider.create(
                AwsBasicCredentials.create(container.getAccessKey(), container.getSecretKey())
        );
    }

    private void configureBucket(S3Client s3Client, S3StorageProperties properties) {
        s3Client.createBucket(CreateBucketRequest.builder().bucket(properties.bucket()).build());
        s3Client.putBucketCors(PutBucketCorsRequest.builder()
                .bucket(properties.bucket())
                .corsConfiguration(CORSConfiguration.builder().corsRules(CORSRule.builder()
                        .allowedOrigins("http://localhost:3000", "http://localhost:3001")
                        .allowedMethods("GET", "HEAD", "PUT")
                        .allowedHeaders("*")
                        .exposeHeaders("ETag")
                        .build()).build())
                .build());
        String resource = "arn:aws:s3:::%s/%s/*".formatted(properties.bucket(), properties.keyPrefix());
        String policy = """
                {"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":["s3:GetObject"],"Resource":["%s"]}]}
                """.formatted(resource).strip();
        s3Client.putBucketPolicy(PutBucketPolicyRequest.builder().bucket(properties.bucket()).policy(policy).build());
    }
}
