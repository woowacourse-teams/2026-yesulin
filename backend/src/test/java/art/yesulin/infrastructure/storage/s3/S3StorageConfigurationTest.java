package art.yesulin.infrastructure.storage.s3;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;

import art.yesulin.application.file.storage.ObjectStorage;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class S3StorageConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(S3StorageConfiguration.class)
            .withPropertyValues(
                    "yesulin.storage.s3.bucket=techcourse-project-2026",
                    "yesulin.storage.s3.key-prefix=yesulin",
                    "yesulin.storage.s3.public-base-url=https://cdn.example.com",
                    "yesulin.storage.s3.region=ap-northeast-2",
                    "yesulin.storage.s3.upload-expiration=PT10M"
            );

    @Test
    void createsS3ObjectStorageWhenBucketIsConfigured() {
        contextRunner.run(context -> {
            assertNull(context.getStartupFailure());
            assertInstanceOf(S3ObjectStorage.class, context.getBean(ObjectStorage.class));
        });
    }
}
