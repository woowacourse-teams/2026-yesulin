package art.yesulin.actor.application.photolibrary;

import art.yesulin.file.application.storage.PresignedUpload;
import java.time.Instant;
import java.util.Map;

/**
 * 브라우저가 공개 사본을 올릴 주소.
 *
 * @param headers 업로드 요청에 그대로 붙일 헤더. 서명에 들어간 값이라 바꾸면 저장소가 거절한다.
 * @param uploadKey 올린 뒤 확정할 때 보내는 키.
 */
public record PhotoPublicCopyUploadResult(
        String url,
        String method,
        Map<String, String> headers,
        Instant expiresAt,
        String uploadKey
) {

    static PhotoPublicCopyUploadResult of(PresignedUpload upload, String uploadKey) {
        return new PhotoPublicCopyUploadResult(
                upload.url(), upload.method(), upload.headers(), upload.expiresAt(), uploadKey
        );
    }
}
