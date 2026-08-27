package art.yesulin.application.admin.log;

/**
 * 운영 로그 조회 조건이다. 파일 경로는 서버 설정으로만 정하고 요청에서 받지 않는다.
 */
public record LogQuery(String keyword, int limit) {

    public static final int MAX_LIMIT = 500;
    public static final int DEFAULT_LIMIT = 200;

    public LogQuery {
        keyword = (keyword == null) ? "" : keyword.trim();
        limit = clampLimit(limit);
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
}
