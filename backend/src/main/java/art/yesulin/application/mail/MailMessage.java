package art.yesulin.application.mail;

public record MailMessage(
        String recipient,
        String subject,
        String textContent,
        String htmlContent
) {
}
