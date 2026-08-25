package art.yesulin.infrastructure.storage.local;

import art.yesulin.application.file.storage.ObjectStorage;
import art.yesulin.infrastructure.storage.s3.S3ObjectStorage;
import art.yesulin.infrastructure.storage.s3.S3StorageProperties;
import java.net.URI;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
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
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.CORSConfiguration;
import software.amazon.awssdk.services.s3.model.CORSRule;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.PutBucketCorsRequest;
import software.amazon.awssdk.services.s3.model.PutBucketPolicyRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration(proxyBeanMethods = false)
@Profile("local")
@ConditionalOnMissingBean(ObjectStorage.class)
@EnableConfigurationProperties({S3StorageProperties.class, LocalStackStorageProperties.class})
public class LocalStackStorageConfiguration {

    private static final DockerImageName LOCALSTACK_IMAGE = DockerImageName.parse("localstack/localstack:3.8.1");

    @Bean(destroyMethod = "stop")
    @ConditionalOnProperty(
            prefix = "yesulin.storage.localstack",
            name = "testcontainers-enabled",
            havingValue = "true",
            matchIfMissing = true
    )
    LocalStackContainer localStackContainer() {
        LocalStackContainer container = new LocalStackContainer(LOCALSTACK_IMAGE).withServices(Service.S3);
        container.start();
        return container;
    }

    @Bean
    LocalStackConnection localStackConnection(
            ObjectProvider<LocalStackContainer> containerProvider,
            LocalStackStorageProperties properties
    ) {
        LocalStackContainer container = containerProvider.getIfAvailable();
        if (container != null) {
            URI endpoint = container.getEndpoint();
            return new LocalStackConnection(
                    endpoint,
                    endpoint,
                    container.getAccessKey(),
                    container.getSecretKey(),
                    container.getRegion()
            );
        }
        return new LocalStackConnection(
                properties.requireEndpoint(),
                properties.resolvePresignerEndpoint(),
                properties.accessKey(),
                properties.secretKey(),
                null
        );
    }

    @Bean
    S3Client localS3Client(LocalStackConnection connection, S3StorageProperties properties) {
        return S3Client.builder()
                .endpointOverride(connection.endpoint())
                .credentialsProvider(credentials(connection))
                .region(Region.of(connection.resolveRegion(properties.region())))
                .forcePathStyle(true)
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .build();
    }

    @Bean
    S3Presigner localS3Presigner(LocalStackConnection connection, S3StorageProperties properties) {
        return S3Presigner.builder()
                .endpointOverride(connection.presignerEndpoint())
                .credentialsProvider(credentials(connection))
                .region(Region.of(connection.resolveRegion(properties.region())))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .build();
    }

    @Bean
    ObjectStorage localObjectStorage(
            LocalStackConnection connection,
            S3Client s3Client,
            S3Presigner presigner,
            S3StorageProperties properties
    ) {
        configureBucket(s3Client, properties);
        S3StorageProperties localProperties = localStorageProperties(connection, properties);
        return new S3ObjectStorage(s3Client, presigner, localProperties);
    }

    private StaticCredentialsProvider credentials(LocalStackConnection connection) {
        return StaticCredentialsProvider.create(
                AwsBasicCredentials.create(connection.accessKey(), connection.secretKey())
        );
    }

    private S3StorageProperties localStorageProperties(
            LocalStackConnection connection,
            S3StorageProperties properties
    ) {
        URI publicBaseUrl = properties.publicBaseUrl();
        if (connection.endpoint().equals(connection.presignerEndpoint())) {
            publicBaseUrl = URI.create("%s/%s/%s".formatted(
                    connection.endpoint(), properties.bucket(), properties.keyPrefix()
            ));
        }
        return new S3StorageProperties(
                properties.bucket(), properties.keyPrefix(), publicBaseUrl,
                connection.resolveRegion(properties.region()), properties.uploadExpiration(),
                properties.downloadExpiration()
        );
    }

    private void configureBucket(S3Client s3Client, S3StorageProperties properties) {
        createBucketIfMissing(s3Client, properties.bucket());
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

    private void createBucketIfMissing(S3Client s3Client, String bucket) {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
        } catch (S3Exception exception) {
            if (exception.statusCode() != 404) {
                throw exception;
            }
            s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
        }
    }

    record LocalStackConnection(
            URI endpoint,
            URI presignerEndpoint,
            String accessKey,
            String secretKey,
            String region
    ) {

        String resolveRegion(String fallbackRegion) {
            return region == null ? fallbackRegion : region;
        }
    }
}
