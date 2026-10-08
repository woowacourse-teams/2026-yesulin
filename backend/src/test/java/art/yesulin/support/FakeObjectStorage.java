package art.yesulin.support;

import art.yesulin.file.application.storage.ObjectStorage;
import art.yesulin.file.application.storage.ObjectUpload;
import art.yesulin.file.application.storage.PresignedUpload;
import art.yesulin.file.application.storage.StoredObjectContent;
import art.yesulin.file.application.storage.StoredObjectMetadata;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

public class FakeObjectStorage implements ObjectStorage {

    private static final Instant EXPIRES_AT = Instant.parse("2030-01-01T00:00:00Z");

    private final Map<String, String> uploadTargets = new ConcurrentHashMap<>();
    private final Map<String, StoredObjectContent> objects = new ConcurrentHashMap<>();
    private final AtomicBoolean failNextDelete = new AtomicBoolean();

    @Override
    public PresignedUpload createUpload(String objectKey, String contentType, long size) {
        String uploadUrl = "https://storage.test/uploads/" + objectKey;
        uploadTargets.put(uploadUrl, objectKey);
        return new PresignedUpload(uploadUrl, "PUT", EXPIRES_AT, Map.of("Content-Type", contentType));
    }

    @Override
    public void put(String objectKey, ObjectUpload upload) {
        try {
            byte[] bytes = upload.content().readNBytes(Math.toIntExact(upload.size()));
            objects.put(objectKey, new StoredObjectContent(upload.contentType(), bytes));
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    @Override
    public Optional<StoredObjectMetadata> inspect(String objectKey) {
        return Optional.ofNullable(objects.get(objectKey))
                .map(object -> new StoredObjectMetadata(object.contentType(), object.bytes().length));
    }

    @Override
    public Optional<StoredObjectContent> read(String objectKey) {
        return Optional.ofNullable(objects.get(objectKey));
    }

    @Override
    public void delete(String objectKey) {
        if (failNextDelete.getAndSet(false)) {
            throw new IllegalStateException("테스트 저장소 삭제 실패");
        }
        objects.remove(objectKey);
    }

    @Override
    public String toPublicUrl(String objectKey) {
        return "https://cdn.test/assets/" + objectKey.replaceFirst("^public/", "");
    }

    @Override
    public String createDownloadUrl(String objectKey) {
        return "https://storage.test/downloads/" + objectKey;
    }

    public void upload(String uploadUrl, String contentType, long size) {
        String objectKey = uploadTargets.get(uploadUrl);
        if (objectKey == null) {
            throw new IllegalArgumentException("발급되지 않은 업로드 URL입니다.");
        }
        objects.put(objectKey, new StoredObjectContent(contentType, new byte[Math.toIntExact(size)]));
    }

    public void failNextDelete() {
        failNextDelete.set(true);
    }

    public boolean contains(String objectKey) {
        return objects.containsKey(objectKey);
    }

    public int objectCount() {
        return objects.size();
    }
}
