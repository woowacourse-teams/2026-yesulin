package art.yesulin.infrastructure.mail;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import art.yesulin.application.mail.MailMessage;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

class GoogleSmtpMailSenderTest {

    @Test
    void sendsTextAndHtmlAsMultipartMail() {
        JavaMailSender javaMailSender = mock(JavaMailSender.class);
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(javaMailSender.createMimeMessage()).thenReturn(mimeMessage);
        GoogleSmtpMailSender mailSender = new GoogleSmtpMailSender(javaMailSender, "sender@yesulin.art");
        MailMessage message = new MailMessage(
                "producer@yesulin.art",
                "이메일 인증",
                "텍스트 본문",
                "<p>HTML 본문</p>"
        );

        assertThatCode(() -> mailSender.send(message)).doesNotThrowAnyException();

        verify(javaMailSender).send(mimeMessage);
    }
}
