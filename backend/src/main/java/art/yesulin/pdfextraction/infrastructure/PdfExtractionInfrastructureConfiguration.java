package art.yesulin.pdfextraction.infrastructure;

import art.yesulin.file.infrastructure.storage.s3.S3StorageProperties;
import art.yesulin.infrastructure.storage.S3PrivateObjects;
import java.time.Duration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfExtractionInfrastructureConfiguration {

    @Bean
    S3PrivateObjects pdfPrivateObjects(S3Client client, S3Presigner presigner, S3StorageProperties properties) {
        Duration uploadExpiration = properties.uploadExpiration().compareTo(Duration.ofMinutes(10)) < 0
                ? properties.uploadExpiration() : Duration.ofMinutes(10);
        return new S3PrivateObjects(client, presigner, properties.bucket(), properties.keyPrefix(),
                uploadExpiration, properties.downloadExpiration());
    }
}
