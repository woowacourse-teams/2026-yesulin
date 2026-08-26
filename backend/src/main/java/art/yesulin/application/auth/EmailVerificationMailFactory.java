package art.yesulin.application.auth;

import art.yesulin.application.mail.MailMessage;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
public class EmailVerificationMailFactory {

    private static final String SUBJECT = "[예술IN] 이메일 인증을 완료해 주세요";

    private final EmailVerificationSettings settings;

    public MailMessage create(String recipient, String token, Instant expiresAt) {
        String url = UriComponentsBuilder.fromUri(settings.verificationUrl())
                .queryParam("token", token)
                .queryParam("redirectUri", settings.redirectUri())
                .build()
                .encode()
                .toUriString();
        return new MailMessage(recipient, SUBJECT, textContent(url, expiresAt), htmlContent(url, expiresAt));
    }

    private String textContent(String url, Instant expiresAt) {
        return "아래 링크를 눌러 이메일 인증을 완료해 주세요.\n"
                + url + "\n만료 시각(UTC): " + expiresAt;
    }

    private String htmlContent(String url, Instant expiresAt) {
        return """
                <h2>예술in 이메일 인증</h2>
                <p>아래 버튼을 눌러 기획사·제작사 계정의 이메일 인증을 완료해 주세요.</p>
                <p><a href="%s">이메일 인증 완료</a></p>
                <p>만료 시각(UTC): %s</p>
                """.formatted(url, expiresAt);
    }
}
