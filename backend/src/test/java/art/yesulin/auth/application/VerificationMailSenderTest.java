package art.yesulin.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import art.yesulin.global.alert.ErrorAlert;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.infrastructure.mail.MailMessage;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.mail.SendFailedException;
import jakarta.mail.internet.InternetAddress;
import java.net.SocketTimeoutException;
import java.util.Map;
import org.eclipse.angus.mail.smtp.SMTPAddressFailedException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.slf4j.event.KeyValuePair;
import org.springframework.mail.MailSendException;

class VerificationMailSenderTest {

    private static final String EMAIL = "private@example.com";
    private static final String CODE = "904321";
    private static final String PRIVATE_REPLY_TEXT = "mailbox " + EMAIL + " rejected code=" + CODE;
    private final MailMessage mail = new MailMessage(EMAIL, "인증", CODE, CODE);
    private final ErrorAlert alert = mock(ErrorAlert.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();
    private final Logger logger = (Logger) LoggerFactory.getLogger(VerificationMailSender.class);

    @BeforeEach
    void attachAppender() {
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void detachAppender() {
        logger.detachAppender(appender);
        appender.stop();
    }

    @ParameterizedTest
    @CsvSource({"550, 550 5.1.1, 5.1.1", "550, 550-5.7.1, 5.7.1", "451, 451 4.3.0, 4.3.0"})
    void initialFailureReportsOnlySafeInformationToAdminLogsAndSlack(
            int smtpStatus, String prefix, String enhancedStatus
    ) {
        VerificationMailSender sender = failingSender(rejectedRecipient(smtpStatus, prefix + " " + PRIVATE_REPLY_TEXT));
        try (MDC.MDCCloseable ignored = MDC.putCloseable("requestId", "test-request")) {
            sender.send(mail, VerificationMailSender.Attempt.INITIAL);
        }
        assertSafeLog("INITIAL_VERIFICATION_FAILED", "SMTP_RECIPIENT_REJECTED");
        assertThat(appender.list.getFirst().getKeyValuePairs())
                .extracting(pair -> pair.key, pair -> pair.value)
                .contains(tuple("smtpStatus", smtpStatus), tuple("smtpEnhancedStatus", enhancedStatus));
        verify(alert).unexpected(new ErrorAlert.UnexpectedError("POST", "/api/v1/producers",
                "INITIAL_VERIFICATION_FAILED · SMTP_RECIPIENT_REJECTED (SMTP "
                        + smtpStatus + " " + enhancedStatus + ")",
                "test-request"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "550", "550 refused 5.1.1", "550 5.1.1@example.com", "550 904321", "554 5.7.1", "550 4.7.1"
    })
    void omitsUnverifiedEnhancedCodes(String prefix) {
        VerificationMailSender sender = failingSender(rejectedRecipient(550, prefix + " " + PRIVATE_REPLY_TEXT));
        sender.send(mail, VerificationMailSender.Attempt.INITIAL);
        assertSafeLog("INITIAL_VERIFICATION_FAILED", "SMTP_RECIPIENT_REJECTED");
        assertThat(appender.list.getFirst().getKeyValuePairs())
                .noneMatch(pair -> pair.key.equals("smtpEnhancedStatus"));
        verify(alert).unexpected(new ErrorAlert.UnexpectedError("POST", "/api/v1/producers",
                "INITIAL_VERIFICATION_FAILED · SMTP_RECIPIENT_REJECTED (SMTP 550)", null));
    }

    @Test
    void resendDoesNotPropagateTheOriginalExceptionOrItsContent() {
        VerificationMailSender sender = failingSender(new MailSendException(
                PRIVATE_REPLY_TEXT, new SocketTimeoutException(PRIVATE_REPLY_TEXT)));
        assertThatThrownBy(() -> sender.send(mail, VerificationMailSender.Attempt.RESEND))
                .isInstanceOfSatisfying(BusinessException.class, failure -> {
                    assertThat(failure.getErrorCode()).isEqualTo(AuthErrorCode.EMAIL_VERIFICATION_DELIVERY_FAILED);
                    assertThat(failure.getMessage()).doesNotContain(EMAIL, CODE);
                    assertThat(failure.getCause()).isNull();
                });
        assertSafeLog("VERIFICATION_RESEND_FAILED", "SMTP_TIMEOUT");
    }

    private VerificationMailSender failingSender(RuntimeException failure) {
        return new VerificationMailSender(message -> {
            throw failure;
        }, alert);
    }

    private MailSendException rejectedRecipient(int smtpStatus, String response) {
        SendFailedException failed = new SendFailedException(response);
        failed.setNextException(new SMTPAddressFailedException(
                new InternetAddress(), "RCPT TO", smtpStatus, response));
        return new MailSendException(Map.of("unused-key", failed));
    }

    private void assertSafeLog(String message, String reason) {
        assertThat(appender.list).singleElement().satisfies(event -> {
            assertThat(event.getFormattedMessage()).isEqualTo(message);
            assertThat(event.getThrowableProxy()).isNull();
            assertThat(event.getKeyValuePairs()).extracting(KeyValuePair::toString)
                    .anyMatch(pair -> pair.contains(reason))
                    .noneMatch(pair -> pair.contains(EMAIL) || pair.contains(CODE));
        });
    }
}
