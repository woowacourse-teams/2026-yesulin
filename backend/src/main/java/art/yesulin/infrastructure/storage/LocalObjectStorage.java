package art.yesulin.infrastructure.storage;

import art.yesulin.application.file.storage.ObjectStorage;
import art.yesulin.application.file.storage.PresignedUpload;
import art.yesulin.application.file.storage.StoredObjectMetadata;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("local")
@ConditionalOnProperty(prefix = "yesulin.storage.s3", name = "bucket", matchIfMissing = true)
public class LocalObjectStorage implements ObjectStorage {

    private static final String MESSAGE = "Object storage is not configured for the local profile";

    @Override
    public PresignedUpload createUpload(String objectKey, String contentType, long size) {
        throw new IllegalStateException(MESSAGE);
    }

    @Override
    public Optional<StoredObjectMetadata> inspect(String objectKey) {
        throw new IllegalStateException(MESSAGE);
    }

    @Override
    public String toPublicUrl(String objectKey) {
        throw new IllegalStateException(MESSAGE);
    }
}
