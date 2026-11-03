package art.yesulin.auth.application;

import art.yesulin.infrastructure.mail.MailMessage;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

@Component
public class EmailVerificationMailFactory {

    private static final String SUBJECT = "[예술in] 이메일 인증번호 안내";
    private static final DateTimeFormatter DEADLINE = DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm:ss")
            .withZone(ZoneId.of("Asia/Seoul"));
    private final String htmlTemplate;

    public EmailVerificationMailFactory() {
        try {
            htmlTemplate = new ClassPathResource("mail/email-verification.html")
                    .getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new IllegalStateException("이메일 인증 템플릿을 읽지 못했습니다.", exception);
        }
    }

    public MailMessage create(String recipient, String code, Instant expiresAt) {
        String deadline = DEADLINE.format(expiresAt);
        return new MailMessage(recipient, SUBJECT, textContent(code, deadline), htmlContent(code, deadline));
    }

    private String textContent(String code, String deadline) {
        return """
                예술in 이메일 인증

                가입 화면에 아래 인증번호 6자리를 입력해 주세요.

                인증번호: %s
                유효 기한: %s (한국시간)

                재전송했다면 가장 최근 메일의 인증번호를 입력해 주세요.
                만료되었다면 가입 화면에서 새 인증번호를 요청해 주세요.

                직접 가입을 요청하지 않으셨다면 이 메일을 무시해 주세요.
                인증번호를 입력하지 않으면 이메일 인증은 완료되지 않습니다.
                """.formatted(code, deadline);
    }

    private String htmlContent(String code, String deadline) {
        return htmlTemplate.replace("{{verificationCode}}", HtmlUtils.htmlEscape(code))
                .replace("{{expiresAt}}", deadline);
    }
}
