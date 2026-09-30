package art.yesulin.application.admin.log;

import java.time.LocalDate;
import java.util.Locale;

/**
 * 운영 로그 조회 조건이다. 파일 경로는 서버 설정으로만 정하고 요청에서 받지 않는다.
 * date가 없거나 오늘이면 현재 로그 파일을, 지난 날짜면 그날 압축 보관된 로그를 읽는다.
 */
public record LogQuery(String keyword, int limit, LocalDate date) {

    public static final int MAX_LIMIT = 500;
    public static final int DEFAULT_LIMIT = 200;

    public LogQuery {
        keyword = (keyword == null) ? "" : keyword.trim();
        limit = clampLimit(limit);
    }

    public LogQuery(String keyword, int limit) {
        this(keyword, limit, null);
    }

    private static int clampLimit(int requested) {
        if (requested < 1) {
            return DEFAULT_LIMIT;
        }
        return Math.min(requested, MAX_LIMIT);
    }

    public boolean hasKeyword() {
        return !keyword.isEmpty();
    }

    public boolean matches(String line) {
        return !hasKeyword() || line.toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT));
    }
}
