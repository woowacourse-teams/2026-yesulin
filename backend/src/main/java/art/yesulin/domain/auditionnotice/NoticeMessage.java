package art.yesulin.domain.auditionnotice;

import java.nio.charset.Charset;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public record NoticeMessage(String phone, String body, String type, int bytes) {

    public static final ZoneId ZONE = ZoneId.of("Asia/Seoul");
    private static final Charset ENCODING = Charset.forName("EUC-KR");
    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public static NoticeMessage create(
            String name, String phone, LocalDateTime appointment, String template, String footer, Clock clock
    ) {
        return create(name, phone, appointment, template, "", footer, clock);
    }

    public static NoticeMessage create(
            String name, String phone, LocalDateTime appointment, String template,
            String header, String footer, Clock clock
    ) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("이름이 수집되지 않은 지원자입니다.");
        }
        String normalized = phone == null ? "" : phone.replace("-", "").replace(" ", "");
        if (!normalized.matches("01[016789][0-9]{7,8}")) {
            throw new IllegalArgumentException("사용 가능한 휴대폰 번호가 없습니다.");
        }
        if (appointment == null || !appointment.atZone(ZONE).toInstant().isAfter(clock.instant())) {
            throw new IllegalArgumentException("오디션 일시는 현재보다 이후여야 합니다. (한국 시간)");
        }
        if (template == null || template.isBlank() || template.length() > 2000) {
            throw new IllegalArgumentException("안내 문구를 1~2,000자 이내로 입력해 주세요.");
        }
        if ((!template.contains("{이름}") && !header.contains("{이름}"))
                || !template.contains("{오디션일시}")) {
            throw new IllegalArgumentException("문구에 {이름}과 {오디션일시}를 포함해 주세요.");
        }
        String remaining = template.replace("{이름}", "").replace("{오디션일시}", "");
        if (remaining.contains("{") || remaining.contains("}")) {
            throw new IllegalArgumentException("지원하지 않는 치환 변수가 있습니다.");
        }
        String body = template.replace("\r\n", "\n").replace("{이름}", name)
                .replace("{오디션일시}", appointment.format(FORMAT)).stripTrailing() + "\n\n" + footer;
        if (!header.isBlank()) {
            body = header.replace("{이름}", name) + "\n\n" + body;
        }
        if (!ENCODING.newEncoder().canEncode(body)) {
            throw new IllegalArgumentException("문자에서 지원하지 않는 글자 또는 이모지가 있습니다.");
        }
        int bytes = body.getBytes(ENCODING).length;
        if (bytes > 2000) {
            throw new IllegalArgumentException("치환된 문구가 LMS 2,000바이트를 초과합니다.");
        }
        return new NoticeMessage(normalized, body, bytes <= 90 ? "SMS" : "LMS", bytes);
    }
}
