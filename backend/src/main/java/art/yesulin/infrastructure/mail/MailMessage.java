package art.yesulin.infrastructure.mail;

public record MailMessage(
        String recipient,
        String subject,
        String textContent,
        String htmlContent
) {
}
