package art.yesulin.application.timetable;

import art.yesulin.domain.timetable.TimetableKey;
import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

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

    public String manage(TimetableKey manageKey) {
        return baseUrl + "/timetable/manage/" + manageKey.getValue();
    }

    public String actor(TimetableKey accessKey) {
        return baseUrl + "/t/" + accessKey.getValue();
    }

    public String home() {
        return baseUrl;
    }

    public String messageQueue() {
        return baseUrl + "/admin/messages";
    }
}
