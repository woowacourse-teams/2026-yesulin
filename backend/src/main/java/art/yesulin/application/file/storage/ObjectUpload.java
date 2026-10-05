package art.yesulin.application.file.storage;

import java.io.InputStream;

/**
 * 서버가 직접 올리는 객체. 내용은 크기만큼 스트림으로 읽어 보내며 메모리에 한 번에 담지 않는다.
 *
 * @param contentDisposition 내려받기 파일 이름이 필요할 때만 값을 넣는다. null이면 설정하지 않는다.
 */
public record ObjectUpload(String contentType, String contentDisposition, long size, InputStream content) {

    public ObjectUpload {
        if (contentType == null || contentType.isBlank()) {
            throw new IllegalArgumentException("Content-Type은 필수입니다.");
        }
        if (size <= 0) {
            throw new IllegalArgumentException("빈 객체는 올릴 수 없습니다.");
        }
        if (content == null) {
            throw new IllegalArgumentException("올릴 내용이 없습니다.");
        }
    }
}
