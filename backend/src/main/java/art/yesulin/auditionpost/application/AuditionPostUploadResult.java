package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.application.AuditionPostFileStorage.PreparedUpload;
import java.time.Instant;
import java.util.Map;

/**
 * 브라우저가 파일을 올릴 주소.
 *
 * @param headers 업로드 요청에 그대로 붙일 헤더. 서명에 들어간 값이라 바꾸면 저장소가 거절한다.
 * @param publicUrl 올린 뒤 본문 사진 주소나 첨부 주소로 쓸 공개 주소. 공고를 저장할 때 이 주소로 업로드를 알아본다.
 */
public record AuditionPostUploadResult(
        String url,
        String method,
        Map<String, String> headers,
        Instant expiresAt,
        String publicUrl
) {

    static AuditionPostUploadResult from(PreparedUpload prepared) {
        return new AuditionPostUploadResult(
                prepared.upload().url(),
                prepared.upload().method(),
                prepared.upload().headers(),
                prepared.upload().expiresAt(),
                prepared.publicUrl()
        );
    }
}
