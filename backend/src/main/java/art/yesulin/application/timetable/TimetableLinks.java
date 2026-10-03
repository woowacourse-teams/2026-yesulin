package art.yesulin.application.timetable;

import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 문자에 넣는 프론트 링크를 만든다. 환경마다 프론트 주소가 다르므로 같은 환경의 백엔드와 연결된 origin을 설정으로 받는다.
 * 열쇠는 경로에 그대로 넣고, API에는 경로 대신 헤더로 보낸다.
 */
@Component
public class TimetableLinks {

    private final String baseUrl;

    public TimetableLinks(@Value("${yesulin.timetable.link-base-url}") String baseUrl) {
        URI uri = URI.create(baseUrl);
        if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))
                || uri.getHost() == null || uri.getRawQuery() != null || uri.getRawFragment() != null
                || !(uri.getPath().isEmpty() || "/".equals(uri.getPath()))) {
            throw new IllegalArgumentException("일정표 링크의 기본 주소는 http/https origin이어야 합니다.");
        }
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    public String manage(String manageKey) {
        return baseUrl + "/timetable/manage/" + manageKey;
    }

    public String actor(String accessKey) {
        return baseUrl + "/timetable/" + accessKey;
    }

    public String messageQueue() {
        return baseUrl + "/admin/messages";
    }
}
