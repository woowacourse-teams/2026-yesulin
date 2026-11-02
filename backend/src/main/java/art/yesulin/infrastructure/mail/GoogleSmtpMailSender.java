package art.yesulin.infrastructure.mail;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "yesulin.mail", name = "enabled", havingValue = "true", matchIfMissing = true)
public class GoogleSmtpMailSender implements MailSender {

    private final JavaMailSender javaMailSender;
    private final String from;

    public GoogleSmtpMailSender(
            JavaMailSender javaMailSender,
            @Value("${yesulin.mail.from}") String from
    ) {
        this.javaMailSender = javaMailSender;
        if (from == null || from.isBlank()) {
            throw new IllegalStateException("메일 발신 주소가 설정되지 않았습니다.");
        }
        this.from = from;
    }

    @Override
    public void send(MailMessage message) {
        MimeMessage mimeMessage = javaMailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, StandardCharsets.UTF_8.name());
            helper.setFrom(from, "예술in");
            helper.setTo(message.recipient());
            helper.setSubject(message.subject());
            mimeMessage.setContent(alternativeContent(message));
        } catch (MessagingException | UnsupportedEncodingException exception) {
            throw new IllegalStateException("메일을 생성하지 못했습니다.", exception);
        }
        javaMailSender.send(mimeMessage);
    }

    private MimeMultipart alternativeContent(MailMessage message) throws MessagingException {
        MimeBodyPart text = new MimeBodyPart();
        text.setText(message.textContent(), StandardCharsets.UTF_8.name());
        MimeBodyPart html = new MimeBodyPart();
        html.setText(message.htmlContent(), StandardCharsets.UTF_8.name(), "html");
        return new MimeMultipart("alternative", text, html);
    }
}
