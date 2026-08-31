package art.yesulin.application.admin.log;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 관리자 로그 조회가 공통으로 다루는 한 건의 로그다.
 * attributes는 구조화 로그에 추가된 이벤트별 필드를 손실 없이 다음 표현 계층으로 전달한다.
 */
public record LogEntry(
        LogEntryFormat format,
        Instant timestamp,
        String level,
        String logger,
        String thread,
        String requestId,
        String message,
        Map<String, Object> attributes,
        String raw
) {

    public LogEntry {
        attributes = Collections.unmodifiableMap(new LinkedHashMap<>(attributes));
    }
}
