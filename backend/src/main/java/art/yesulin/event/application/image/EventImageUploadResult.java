package art.yesulin.event.application.image;

import art.yesulin.file.application.storage.PresignedUpload;
import java.time.Instant;
import java.util.Map;

/**
 * 브라우저가 이벤트 이미지를 올릴 주소.
 *
 * @param headers 업로드 요청에 그대로 붙일 헤더. 서명에 들어간 값이라 바꾸면 저장소가 거절한다.
 * @param imageUrl 올린 뒤의 공개 주소. 이벤트를 저장할 때 이 주소로 확정한다.
 */
public record EventImageUploadResult(
        String url,
        String method,
        Map<String, String> headers,
        Instant expiresAt,
        String imageUrl
) {

    static EventImageUploadResult of(PresignedUpload upload, String imageUrl) {
        return new EventImageUploadResult(
                upload.url(), upload.method(), upload.headers(), upload.expiresAt(), imageUrl
        );
    }
}
