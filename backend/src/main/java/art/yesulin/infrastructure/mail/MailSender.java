package art.yesulin.infrastructure.mail;

public interface MailSender {

    void send(MailMessage message);
}
