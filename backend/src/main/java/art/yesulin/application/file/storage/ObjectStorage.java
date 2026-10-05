package art.yesulin.application.file.storage;

import java.util.Optional;

public interface ObjectStorage {

    PresignedUpload createUpload(String objectKey, String contentType, long size);

    /** 서버가 외부에서 받은 파일을 그대로 올린다. 키마다 내용이 바뀌지 않는 객체에만 쓴다. */
    void put(String objectKey, ObjectUpload upload);

    Optional<StoredObjectMetadata> inspect(String objectKey);

    String createDownloadUrl(String objectKey);

    Optional<StoredObjectContent> read(String objectKey);

    void delete(String objectKey);

    String toPublicUrl(String objectKey);
}
