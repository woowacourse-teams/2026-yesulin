package art.yesulin.application.file.storage;

import java.util.Optional;

public interface ObjectStorage {

    PresignedUpload createUpload(String objectKey, String contentType, long size);

    Optional<StoredObjectMetadata> inspect(String objectKey);

    String createDownloadUrl(String objectKey);

    String toPublicUrl(String objectKey);
}
