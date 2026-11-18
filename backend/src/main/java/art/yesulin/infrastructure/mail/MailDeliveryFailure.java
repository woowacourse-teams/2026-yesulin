package art.yesulin.infrastructure.mail;

import jakarta.mail.AuthenticationFailedException;
import jakarta.mail.MessagingException;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.util.ArrayDeque;
import java.util.Collections;
import java.util.Deque;
import java.util.IdentityHashMap;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.net.ssl.SSLException;
import org.eclipse.angus.mail.smtp.SMTPAddressFailedException;
import org.eclipse.angus.mail.smtp.SMTPSendFailedException;
import org.eclipse.angus.mail.smtp.SMTPSenderFailedException;
import org.eclipse.angus.mail.util.MailConnectException;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailParseException;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.MailSendException;

public record MailDeliveryFailure(String reason, Integer smtpStatus, String smtpEnhancedStatus) {

    private static final Pattern ENHANCED_REPLY = Pattern.compile(
            "([45][0-9]{2})[ -]([45]\\.[0-9]{1,3}\\.[0-9]{1,3})(?=[ \\t\\r\\n]|\\z)");

    public static MailDeliveryFailure from(RuntimeException exception) {
        Deque<Throwable> pending = new ArrayDeque<>();
        Set<Throwable> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        enqueue(exception, pending, seen);
        while (!pending.isEmpty()) {
            Throwable failure = pending.removeFirst();
            MailDeliveryFailure diagnostic = classify(failure);
            if (diagnostic != null) {
                return diagnostic;
            }
            enqueueCauses(failure, pending, seen);
        }
        return failure("MAIL_SEND_FAILED");
    }

    private static MailDeliveryFailure classify(Throwable failure) {
        return switch (failure) {
            case MailAuthenticationException ignored -> failure("SMTP_AUTHENTICATION_FAILED");
            case AuthenticationFailedException ignored -> failure("SMTP_AUTHENTICATION_FAILED");
            case SMTPAddressFailedException rejected ->
                    rejected("SMTP_RECIPIENT_REJECTED", rejected.getReturnCode(), rejected.getMessage());
            case SMTPSenderFailedException rejected ->
                    rejected("SMTP_SENDER_REJECTED", rejected.getReturnCode(), rejected.getMessage());
            case SMTPSendFailedException rejected ->
                    rejected("SMTP_COMMAND_REJECTED", rejected.getReturnCode(), rejected.getMessage());
            case SocketTimeoutException ignored -> failure("SMTP_TIMEOUT");
            case SSLException ignored -> failure("SMTP_TLS_FAILED");
            case MailConnectException connection -> classifyConnection(connection);
            case SocketException ignored -> failure("SMTP_CONNECTION_FAILED");
            case UnknownHostException ignored -> failure("SMTP_DNS_FAILED");
            case MailParseException ignored -> failure("MAIL_PREPARATION_FAILED");
            case MailPreparationException ignored -> failure("MAIL_PREPARATION_FAILED");
            default -> null;
        };
    }

    private static MailDeliveryFailure classifyConnection(MailConnectException exception) {
        return switch (exception.getCause()) {
            case SocketTimeoutException ignored -> failure("SMTP_TIMEOUT");
            case SSLException ignored -> failure("SMTP_TLS_FAILED");
            case UnknownHostException ignored -> failure("SMTP_DNS_FAILED");
            case null, default -> failure("SMTP_CONNECTION_FAILED");
        };
    }

    private static void enqueueCauses(Throwable failure, Deque<Throwable> pending, Set<Throwable> seen) {
        enqueue(failure.getCause(), pending, seen);
        if (failure instanceof MessagingException messaging) {
            enqueue(messaging.getNextException(), pending, seen);
        }
        if (failure instanceof MailSendException sendFailure) {
            for (Exception messageFailure : sendFailure.getMessageExceptions()) {
                enqueue(messageFailure, pending, seen);
            }
        }
    }

    private static void enqueue(Throwable failure, Deque<Throwable> pending, Set<Throwable> seen) {
        if (failure != null && seen.add(failure)) {
            pending.addLast(failure);
        }
    }

    private static MailDeliveryFailure rejected(String reason, int smtpStatus, String response) {
        if (smtpStatus >= 400 && smtpStatus <= 599) {
            return new MailDeliveryFailure(reason, smtpStatus, enhancedStatus(smtpStatus, response));
        }
        return failure(reason);
    }

    private static String enhancedStatus(int smtpStatus, String response) {
        if (response == null) {
            return null;
        }
        Matcher match = ENHANCED_REPLY.matcher(response);
        if (!match.lookingAt() || Integer.parseInt(match.group(1)) != smtpStatus
                || match.group(2).charAt(0) != response.charAt(0)) {
            return null;
        }
        return match.group(2);
    }

    private static MailDeliveryFailure failure(String reason) {
        return new MailDeliveryFailure(reason, null, null);
    }
}
