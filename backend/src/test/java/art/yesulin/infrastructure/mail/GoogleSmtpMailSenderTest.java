package art.yesulin.infrastructure.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

class GoogleSmtpMailSenderTest {

    @Test
    void sendsTextAndHtmlAsAlternativesWithoutAttachmentWrappers() throws Exception {
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

        mailSender.send(message);

        verify(javaMailSender).send(mimeMessage);

        ByteArrayOutputStream serialized = new ByteArrayOutputStream();
        mimeMessage.writeTo(serialized);
        MimeMessage received = new MimeMessage(Session.getInstance(new Properties()),
                new ByteArrayInputStream(serialized.toByteArray()));
        InternetAddress sender = (InternetAddress) received.getFrom()[0];
        assertThat(sender.getAddress()).isEqualTo("sender@yesulin.art");
        assertThat(sender.getPersonal()).isEqualTo("예술in");
        assertThat(received.getAllRecipients()[0].toString()).isEqualTo("producer@yesulin.art");
        assertThat(received.getSubject()).isEqualTo("이메일 인증");
        assertThat(received.isMimeType("multipart/alternative")).isTrue();
        MimeMultipart content = (MimeMultipart) received.getContent();
        assertThat(content.getCount()).isEqualTo(2);
        assertThat(content.getBodyPart(0).isMimeType("text/plain")).isTrue();
        assertThat(content.getBodyPart(0).getContent()).isEqualTo("텍스트 본문");
        assertThat(content.getBodyPart(1).isMimeType("text/html")).isTrue();
        assertThat(content.getBodyPart(1).getContent()).isEqualTo("<p>HTML 본문</p>");
    }
}
