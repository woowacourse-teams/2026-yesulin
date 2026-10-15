package art.yesulin.company.application.photo;

import art.yesulin.file.application.storage.PresignedUpload;
import java.time.Instant;
import java.util.Map;

/**
 * 브라우저가 공연사 사진을 올릴 주소.
 *
 * @param headers 업로드 요청에 그대로 붙일 헤더. 서명에 들어간 값이라 바꾸면 저장소가 거절한다.
 * @param photoUrl 운영자 업로드의 공개 주소. 공연사를 저장할 때 이 주소로 확정한다. 수정 요청 업로드는 null이다.
 * @param uploadKey 수정 요청 업로드의 키. 요청을 보낼 때 이 키로 확정한다. 운영자 업로드는 null이다.
 */
public record CompanyPhotoUploadResult(
        String url,
        String method,
        Map<String, String> headers,
        Instant expiresAt,
        String photoUrl,
        String uploadKey
) {

    static CompanyPhotoUploadResult of(PresignedUpload upload, String photoUrl, String uploadKey) {
        return new CompanyPhotoUploadResult(
                upload.url(), upload.method(), upload.headers(), upload.expiresAt(), photoUrl, uploadKey
        );
    }
}
