package art.yesulin.feedback.domain;

import java.util.regex.Pattern;

/**
 * 의견을 보낸 화면. 개인정보가 섞일 수 있는 쿼리와 해시는 버리고 경로만 남긴다.
 * URL 경로에 쓰는 문자만 받고, 줄바꿈·공백·꺾쇠처럼 알림 문구를 바꿀 수 있는 문자가 있으면 경로를 비운다.
 * 경로나 브라우저 정보가 이상하면 의견 접수를 막지 않고 빈 값으로 둔다.
 */
public record FeedbackPage(String path, String userAgent) {

    private static final Pattern SAFE_PATH = Pattern.compile("/[A-Za-z0-9\\-._~%/@:+!$'()*,;=]*");

    public FeedbackPage {
        path = normalizePath(path);
        userAgent = truncate(userAgent, Feedback.USER_AGENT_MAX);
    }

    private static String normalizePath(String raw) {
        if (raw == null || raw.startsWith("//")) {
            return "";
        }
        String path = truncate(raw.split("[?#]", 2)[0], Feedback.PAGE_PATH_MAX);
        if (!SAFE_PATH.matcher(path).matches()) {
            return "";
        }
        return path;
    }

    private static String truncate(String value, int maximum) {
        if (value == null) {
            return "";
        }
        String stripped = value.strip();
        if (stripped.length() <= maximum) {
            return stripped;
        }
        return stripped.substring(0, maximum);
    }
}
