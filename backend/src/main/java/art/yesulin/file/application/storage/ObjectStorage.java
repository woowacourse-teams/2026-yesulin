package art.yesulin.file.application.storage;

import java.util.Optional;

public interface ObjectStorage {

    PresignedUpload createUpload(String objectKey, String contentType, long size);

    /** 서버가 외부에서 받은 파일을 그대로 올린다. 키마다 내용이 바뀌지 않는 객체에만 쓴다. */
    void put(String objectKey, ObjectUpload upload);

    /**
     * 브라우저가 올린 객체의 응답 헤더를 서버가 직접 올린 객체와 같게 바꾼다. 내용은 그대로 두고 저장소 안에서 복사하므로
     * 브라우저 업로드에는 형식 외의 헤더를 서명하지 않아도 된다.
     *
     * @param contentDisposition 내려받기 파일 이름이 필요할 때만 값을 넣는다. null이면 설정하지 않는다.
     */
    void replaceHeaders(String objectKey, String contentType, String contentDisposition);

    Optional<StoredObjectMetadata> inspect(String objectKey);

    String createDownloadUrl(String objectKey);

    Optional<StoredObjectContent> read(String objectKey);

    void delete(String objectKey);

    String toPublicUrl(String objectKey);
}
