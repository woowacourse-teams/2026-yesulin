package art.yesulin.application.notice;

import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OtrNoticeLink {

    private final String baseUrl;

    public OtrNoticeLink(@Value("${yesulin.notice.link-base-url}") String baseUrl) {
        URI uri = URI.create(baseUrl);
        if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))
                || uri.getHost() == null || uri.getRawUserInfo() != null
                || uri.getRawQuery() != null || uri.getRawFragment() != null
                || !(uri.getPath().isEmpty() || "/".equals(uri.getPath()))) {
            throw new IllegalArgumentException("공고 경유 링크의 기본 주소는 http/https origin이어야 합니다.");
        }
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    public String create(String externalId) {
        validateExternalId(externalId);
        return baseUrl + "/otr?vid=" + externalId;
    }

    public URI destination(String externalId) {
        validateExternalId(externalId);
        return URI.create("https://otr.co.kr/audition/?vid=" + externalId);
    }

    private void validateExternalId(String externalId) {
        if (externalId == null || !externalId.matches("[0-9]{1,30}")) {
            throw new IllegalArgumentException("OTR 공고 번호는 숫자 1~30자여야 합니다.");
        }
    }
}
