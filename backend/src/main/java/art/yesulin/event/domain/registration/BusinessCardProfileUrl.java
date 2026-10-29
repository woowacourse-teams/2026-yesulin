package art.yesulin.event.domain.registration;

import art.yesulin.event.domain.EventErrorCode;
import art.yesulin.global.exception.BusinessException;
import java.net.URI;
import java.net.URISyntaxException;

/** 운영자가 확인한 공개 프로필 주소. QR 경유 주소를 다시 연결해 순환시키지 않는다. */
public final class BusinessCardProfileUrl {

    private BusinessCardProfileUrl() {
    }

    public static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.strip();
        // 서비스 안에서 생성한 공개 프로필 경로. 호스트가 바뀌어도 같은 프로필을 가리킨다.
        if (normalized.matches("^/actors/@(?!\\.)(?!.*\\.\\.)(?!.*\\.$)[a-z0-9._]{1,30}$")) {
            return normalized;
        }
        try {
            URI uri = URI.create(normalized);
            if (normalized.length() > 2000 || !"https".equalsIgnoreCase(uri.getScheme())
                    || uri.getHost() == null || uri.getRawUserInfo() != null
                    || normalized.chars().anyMatch(character -> character <= 32 || character == 127)
                    || normalizedPath(uri).matches("(?i)/(?:n|events/cards)(?:/.*)?")) {
                throw new IllegalArgumentException();
            }
            String ascii = uri.toASCIIString();
            if (ascii.length() > 2000) {
                throw new IllegalArgumentException();
            }
            return ascii;
        } catch (IllegalArgumentException | URISyntaxException exception) {
            throw new BusinessException(EventErrorCode.INVALID_INPUT, "공개 프로필의 HTTPS 주소를 입력해 주세요.");
        }
    }

    private static String normalizedPath(URI uri) throws URISyntaxException {
        // 디코딩한 경로로 점 세그먼트도 정리하고, 브라우저처럼 루트 위의 부모 경로는 무시한다.
        return new URI(null, null, uri.getPath(), null).normalize().getPath().replaceFirst("^/(?:\\.\\./)+", "/");
    }
}
