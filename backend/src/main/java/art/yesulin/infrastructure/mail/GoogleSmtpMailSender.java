package art.yesulin.infrastructure.mail;

import art.yesulin.application.mail.MailMessage;
import art.yesulin.application.mail.MailSender;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

@Component
public class GoogleSmtpMailSender implements MailSender {

    private final JavaMailSender javaMailSender;
    private final String from;

    public GoogleSmtpMailSender(
            JavaMailSender javaMailSender,
            @Value("${yesulin.mail.from:}") String from
    ) {
        this.javaMailSender = javaMailSender;
        this.from = from;
    }

    @Override
    public void send(MailMessage message) {
        if (from == null || from.isBlank()) {
            throw new IllegalStateException("메일 발신 주소가 설정되지 않았습니다.");
        }
        MimeMessage mimeMessage = javaMailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(message.recipient());
            helper.setSubject(message.subject());
            helper.setText(message.textContent(), message.htmlContent());
        } catch (MessagingException exception) {
            throw new IllegalStateException("메일을 생성하지 못했습니다.", exception);
        }
        javaMailSender.send(mimeMessage);
    }
}
