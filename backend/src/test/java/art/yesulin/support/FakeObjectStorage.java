package art.yesulin.support;

import art.yesulin.application.file.storage.ObjectStorage;
import art.yesulin.application.file.storage.PresignedUpload;
import art.yesulin.application.file.storage.StoredObjectMetadata;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public class FakeObjectStorage implements ObjectStorage {

    private static final Instant EXPIRES_AT = Instant.parse("2030-01-01T00:00:00Z");

    private final Map<String, String> uploadTargets = new ConcurrentHashMap<>();
    private final Map<String, StoredObjectMetadata> objects = new ConcurrentHashMap<>();

    @Override
    public PresignedUpload createUpload(String objectKey, String contentType, long size) {
        String uploadUrl = "https://storage.test/uploads/" + objectKey;
        uploadTargets.put(uploadUrl, objectKey);
        return new PresignedUpload(uploadUrl, "PUT", EXPIRES_AT, Map.of("Content-Type", contentType));
    }

    @Override
    public Optional<StoredObjectMetadata> inspect(String objectKey) {
        return Optional.ofNullable(objects.get(objectKey));
    }

    @Override
    public String toPublicUrl(String objectKey) {
        return "https://cdn.test/assets/" + objectKey;
    }

    public void upload(String uploadUrl, String contentType, long size) {
        String objectKey = uploadTargets.get(uploadUrl);
        if (objectKey == null) {
            throw new IllegalArgumentException("발급되지 않은 업로드 URL입니다.");
        }
        objects.put(objectKey, new StoredObjectMetadata(contentType, size));
    }
}
