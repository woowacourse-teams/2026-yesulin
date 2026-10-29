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
    private final Map<String, String> dispositions = new ConcurrentHashMap<>();
    private final Map<String, String> cacheControls = new ConcurrentHashMap<>();

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
    public void replaceHeaders(String objectKey, String contentType, String contentDisposition, String cacheControl) {
        StoredObjectContent object = objects.get(objectKey);
        if (object == null) {
            throw new IllegalStateException("없는 객체의 헤더는 바꿀 수 없습니다.");
        }
        objects.put(objectKey, new StoredObjectContent(contentType, object.bytes()));
        if (contentDisposition == null) {
            dispositions.remove(objectKey);
        } else {
            dispositions.put(objectKey, contentDisposition);
        }
        cacheControls.put(objectKey, cacheControl);
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

    /** 내용까지 정해서 올린다. 파일 앞부분으로 형식을 확인하는 업로드에 쓴다. */
    public void upload(String uploadUrl, String contentType, byte[] content) {
        String objectKey = uploadTargets.get(uploadUrl);
        if (objectKey == null) {
            throw new IllegalArgumentException("발급되지 않은 업로드 URL입니다.");
        }
        objects.put(objectKey, new StoredObjectContent(contentType, content.clone()));
        cacheControls.remove(objectKey);
    }

    public String cacheControl(String objectKey) {
        return cacheControls.get(objectKey);
    }

    public void failNextDelete() {
        failNextDelete.set(true);
    }

    public String contentDisposition(String objectKey) {
        return dispositions.get(objectKey);
    }

    public boolean contains(String objectKey) {
        return objects.containsKey(objectKey);
    }

    public int objectCount() {
        return objects.size();
    }
}
