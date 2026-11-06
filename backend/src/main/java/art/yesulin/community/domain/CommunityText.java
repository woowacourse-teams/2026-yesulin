package art.yesulin.community.domain;

public final class CommunityText {

    private CommunityText() {
    }

    public static String required(String value, int maximum) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("내용을 입력해 주세요.");
        }
        String normalized = value.replace("\r\n", "\n").replace('\r', '\n').strip();
        if (normalized.length() > maximum) {
            throw new IllegalArgumentException("최대 %d자까지 입력할 수 있어요.".formatted(maximum));
        }
        return normalized;
    }

    public static String optional(String value, int maximum) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return required(value, maximum);
    }
}
