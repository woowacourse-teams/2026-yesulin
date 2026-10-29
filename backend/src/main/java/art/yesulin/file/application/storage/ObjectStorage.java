package art.yesulin.file.application.storage;

import java.util.Optional;

public interface ObjectStorage {

    /** 키마다 내용이 바뀌지 않는 공개 객체의 캐시 설정. */
    String IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

    PresignedUpload createUpload(String objectKey, String contentType, long size);

    /** 서버가 외부에서 받은 파일을 그대로 올린다. 키마다 내용이 바뀌지 않는 객체에만 쓴다. */
    void put(String objectKey, ObjectUpload upload);

    /**
     * 브라우저가 올린 객체의 응답 헤더를 서버가 직접 올린 객체와 같게 바꾼다. 내용은 그대로 두고 저장소 안에서 복사하므로
     * 브라우저 업로드에는 형식 외의 헤더를 서명하지 않아도 된다.
     *
     * @param contentDisposition 내려받기 파일 이름이 필요할 때만 값을 넣는다. null이면 설정하지 않는다.
     */
    default void replaceHeaders(String objectKey, String contentType, String contentDisposition) {
        replaceHeaders(objectKey, contentType, contentDisposition, IMMUTABLE_CACHE_CONTROL);
    }

    /** 캐시 설정을 직접 정해 응답 헤더를 바꾼다. 지울 수 있는 공개 객체처럼 오래 캐시하면 안 될 때 쓴다. */
    void replaceHeaders(String objectKey, String contentType, String contentDisposition, String cacheControl);

    Optional<StoredObjectMetadata> inspect(String objectKey);

    String createDownloadUrl(String objectKey);

    Optional<StoredObjectContent> read(String objectKey);

    void delete(String objectKey);

    String toPublicUrl(String objectKey);
}
