package art.yesulin.event.application.registration;

import art.yesulin.file.application.storage.PresignedUpload;
import java.time.Instant;
import java.util.Map;

/**
 * 브라우저가 참가 신청 프로필 사진을 올릴 주소.
 *
 * @param headers 업로드 요청에 그대로 붙일 헤더. 서명에 들어간 값이라 바꾸면 저장소가 거절한다.
 * @param uploadKey 신청을 보낼 때 이 키로 사진을 확정한다.
 */
public record EventRegistrationPhotoUploadResult(
        String url,
        String method,
        Map<String, String> headers,
        Instant expiresAt,
        String uploadKey
) {

    static EventRegistrationPhotoUploadResult of(PresignedUpload upload, String uploadKey) {
        return new EventRegistrationPhotoUploadResult(
                upload.url(), upload.method(), upload.headers(), upload.expiresAt(), uploadKey
        );
    }
}
