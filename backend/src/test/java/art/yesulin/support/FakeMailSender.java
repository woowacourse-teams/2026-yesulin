package art.yesulin.support;

import art.yesulin.infrastructure.mail.MailMessage;
import art.yesulin.infrastructure.mail.MailSender;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component("testMailSender")
@Profile("test")
public class FakeMailSender implements MailSender {

    @Override
    public void send(MailMessage message) {
        // 테스트에서는 외부 SMTP 서버에 연결하지 않는다.
    }
}
