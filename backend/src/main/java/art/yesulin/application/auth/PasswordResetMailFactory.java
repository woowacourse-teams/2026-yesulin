package art.yesulin.application.auth;

import art.yesulin.application.mail.MailMessage;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
public class PasswordResetMailFactory {

    private static final String SUBJECT = "[예술in] 비밀번호를 재설정해 주세요";

    private final PasswordResetSettings settings;

    public MailMessage create(String recipient, String token, Instant expiresAt) {
        String url = UriComponentsBuilder.fromUri(settings.resetUrl())
                .queryParam("token", token)
                .build()
                .encode()
                .toUriString();
        return new MailMessage(recipient, SUBJECT, textContent(url, expiresAt), htmlContent(url, expiresAt));
    }

    private String textContent(String url, Instant expiresAt) {
        return "아래 링크를 눌러 비밀번호를 재설정해 주세요.\n"
                + url + "\n만료 시각(UTC): " + expiresAt;
    }

    private String htmlContent(String url, Instant expiresAt) {
        return """
                <h2>예술in 비밀번호 재설정</h2>
                <p>아래 버튼을 눌러 기획사·제작사 계정의 새 비밀번호를 설정해 주세요.</p>
                <p><a href="%s">비밀번호 재설정</a></p>
                <p>만료 시각(UTC): %s</p>
                """.formatted(url, expiresAt);
    }
}
