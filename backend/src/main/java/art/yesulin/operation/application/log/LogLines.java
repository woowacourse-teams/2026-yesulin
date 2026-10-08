package art.yesulin.operation.application.log;

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

    /** 읽을 수는 있지만 해당 조건의 로그가 없는 경우다. 보관 기간이 지난 날짜도 여기에 해당한다. */
    public static LogLines empty(Instant readAt) {
        return new LogLines(List.of(), List.of(), false, true, readAt);
    }
}
