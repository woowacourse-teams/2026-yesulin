package art.yesulin.application.admin.log;

import java.time.Instant;
import java.util.List;

/**
 * 로그 조회 결과다. truncated는 읽기 상한 때문에 더 오래된 내용을 보지 못했음을 뜻한다.
 */
public record LogLines(List<String> lines, boolean truncated, boolean available, Instant readAt) {

    public static LogLines unavailable(Instant readAt) {
        return new LogLines(List.of(), false, false, readAt);
    }
}
