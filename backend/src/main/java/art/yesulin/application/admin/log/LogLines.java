package art.yesulin.application.admin.log;

import java.time.Instant;
import java.util.List;

/**
 * 로그 조회 결과다.
 * truncated는 생략된 더 오래된 줄이 있다는 뜻이고, 읽기 상한과 반환 줄 수 상한 어느 쪽 때문이든 참이 된다.
 */
public record LogLines(
        List<String> lines,
        List<LogEntry> entries,
        boolean truncated,
        boolean available,
        Instant readAt
) {

    public static LogLines unavailable(Instant readAt) {
        return new LogLines(List.of(), List.of(), false, false, readAt);
    }
}
