package art.yesulin.infrastructure.storage.local;

import static org.junit.jupiter.api.Assertions.assertEquals;

import art.yesulin.infrastructure.storage.s3.S3StorageProperties;
import java.net.URI;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class LocalStackStorageConfigurationTest {

    @Test
    void createsPublicBaseUrlIncludingPublicObjectPrefix() {
        S3StorageProperties properties = new S3StorageProperties(
                "yesulin-local",
                "yesulin",
                URI.create("http://localhost:4566/unused"),
                "ap-northeast-2",
                Duration.ofMinutes(10),
                Duration.ofMinutes(10)
        );

        URI result = LocalStackStorageConfiguration.localPublicBaseUrl(
                URI.create("http://localhost:4566"), properties
        );

        assertEquals(
                URI.create("http://localhost:4566/yesulin-local/yesulin/public"),
                result
        );
    }
}
