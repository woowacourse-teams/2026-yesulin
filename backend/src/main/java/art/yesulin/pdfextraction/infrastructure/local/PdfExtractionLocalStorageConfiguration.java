package art.yesulin.pdfextraction.infrastructure.local;

import art.yesulin.file.application.storage.ObjectStorage;
import art.yesulin.file.infrastructure.storage.s3.S3ObjectStorage;
import art.yesulin.file.infrastructure.storage.s3.S3StorageProperties;
import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/** 실제 AWS 인증과 개인 config 없이 실행하는 PDF 확인 전용 저장소 설정. */
@Configuration(proxyBeanMethods = false)
@Profile("pdf-extraction-local")
@EnableConfigurationProperties(S3StorageProperties.class)
public class PdfExtractionLocalStorageConfiguration {

    @Bean
    S3Client pdfLocalS3Client(S3StorageProperties properties,
                            @Value("${yesulin.pdf-extraction.local-endpoint}") URI endpoint) {
        requireLocal(endpoint);
        return S3Client.builder().endpointOverride(endpoint).region(Region.of(properties.region()))
                .credentialsProvider(credentials()).forcePathStyle(true)
                .httpClientBuilder(UrlConnectionHttpClient.builder()).build();
    }

    @Bean
    S3Presigner pdfLocalS3Presigner(S3StorageProperties properties,
                                  @Value("${yesulin.pdf-extraction.local-endpoint}") URI endpoint) {
        requireLocal(endpoint);
        return S3Presigner.builder().endpointOverride(endpoint).region(Region.of(properties.region()))
                .credentialsProvider(credentials())
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build()).build();
    }

    @Bean
    ObjectStorage pdfLocalObjectStorage(S3Client client, S3Presigner presigner, S3StorageProperties properties) {
        return new S3ObjectStorage(client, presigner, properties);
    }

    private StaticCredentialsProvider credentials() {
        return StaticCredentialsProvider.create(AwsBasicCredentials.create("test", "test"));
    }

    private void requireLocal(URI endpoint) {
        if (!"http".equals(endpoint.getScheme())
                || !("localhost".equals(endpoint.getHost()) || "127.0.0.1".equals(endpoint.getHost()))) {
            throw new IllegalArgumentException("로컬 PDF 저장소는 이 PC의 HTTP endpoint만 사용할 수 있습니다.");
        }
    }
}
