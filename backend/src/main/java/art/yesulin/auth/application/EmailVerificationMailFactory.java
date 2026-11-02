package art.yesulin.auth.application;

import art.yesulin.infrastructure.mail.MailMessage;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Component;

@Component
public class EmailVerificationMailFactory {

    private static final String SUBJECT = "[예술in] 이메일 인증번호 안내";
    private static final DateTimeFormatter DEADLINE = DateTimeFormatter.ofPattern("HH:mm:ss")
            .withZone(ZoneId.of("Asia/Seoul"));

    public MailMessage create(String recipient, String code, Instant expiresAt) {
        String deadline = DEADLINE.format(expiresAt);
        return new MailMessage(recipient, SUBJECT, textContent(code, deadline), htmlContent(code, deadline));
    }

    private String textContent(String code, String deadline) {
        return "예술in 이메일 인증번호: " + code + "\n가입 화면에 숫자 6자리를 입력해 주세요.\n"
                + "만료 시각(한국시간): " + deadline + "\n요청하지 않았다면 이 메일을 무시해 주세요.";
    }

    private String htmlContent(String code, String deadline) {
        return """
                <h2>예술in 이메일 인증</h2>
                <p>가입 화면에 아래 숫자 6자리를 입력해 주세요.</p>
                <p style="font-size:32px;font-weight:bold;letter-spacing:8px">%s</p>
                <p>만료 시각(한국시간): %s. 요청하지 않았다면 이 메일을 무시해 주세요.</p>
                """.formatted(code, deadline);
    }
}
