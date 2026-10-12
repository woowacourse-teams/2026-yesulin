package art.yesulin.auditionpost.infrastructure.slack;

/**
 * 공고 알림 메시지 형식. 운영자가 메시지를 그대로 오픈채팅방에 옮기므로 OTR 공고와 기획사 공고가 같은 형식을 쓴다.
 * 공고 내용은 외부에서 온 글이라, Slack이 전체 멘션이나 위장 링크로 해석하지 않도록 {@code & < >}를 바꿔 쓴다.
 */
final class SlackAuditionMessages {

    private SlackAuditionMessages() {
    }

    static StringBuilder header(int count) {
        return new StringBuilder("🔔 예술in 오디션 공고 알림 · ").append(count).append("건\n");
    }

    static void appendAlert(StringBuilder message, String category, String title, String pay, String deadline,
            String link) {
        if (!isBlank(category)) {
            message.append("\n[").append(escape(category)).append("] ");
        }
        message.append(escape(title))
                .append("\n페이: ").append(display(pay))
                .append(" | 마감: ").append(display(deadline))
                .append("\n자세히 보기\n").append(link);
    }

    static String escape(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private static String display(String value) {
        return isBlank(value) ? "미기재" : escape(value);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
