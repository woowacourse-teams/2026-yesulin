package art.yesulin.auth.application;

import art.yesulin.global.alert.ErrorAlert;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.global.web.RequestLoggingFilter;
import art.yesulin.infrastructure.mail.MailDeliveryFailure;
import art.yesulin.infrastructure.mail.MailMessage;
import art.yesulin.infrastructure.mail.MailSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.slf4j.spi.LoggingEventBuilder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
class VerificationMailSender {

    private final MailSender mailSender;
    private final ErrorAlert errorAlert;

    void send(MailMessage message, Attempt attempt) {
        try {
            mailSender.send(message);
        } catch (RuntimeException exception) {
            reportFailure(attempt, exception, MailDeliveryFailure.from(exception));
            if (attempt != Attempt.INITIAL) {
                throw new BusinessException(AuthErrorCode.EMAIL_VERIFICATION_DELIVERY_FAILED,
                        "인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.");
            }
        }
    }

    void reportInitialIssueFailure(RuntimeException exception) {
        reportFailure(Attempt.INITIAL, exception,
                new MailDeliveryFailure("VERIFICATION_ISSUE_FAILED", null, null));
    }

    private void reportFailure(Attempt attempt, RuntimeException exception, MailDeliveryFailure failure) {
        LoggingEventBuilder event = log.atError()
                .addKeyValue("event", "UNEXPECTED_SERVICE_ERROR")
                .addKeyValue("exception", exception.getClass().getSimpleName())
                .addKeyValue("mailFailureReason", failure.reason());
        if (failure.smtpStatus() != null) {
            event.addKeyValue("smtpStatus", failure.smtpStatus());
        }
        if (failure.smtpEnhancedStatus() != null) {
            event.addKeyValue("smtpEnhancedStatus", failure.smtpEnhancedStatus());
        }
        event.log(attempt.message);
        notifySlack(attempt, failure);
    }

    private void notifySlack(Attempt attempt, MailDeliveryFailure failure) {
        String diagnostic = attempt.message + " · " + failure.reason() + smtpDiagnostic(failure);
        errorAlert.unexpected(new ErrorAlert.UnexpectedError(
                "POST", attempt.endpoint, diagnostic, MDC.get(RequestLoggingFilter.REQUEST_ID_MDC_KEY)));
    }

    private String smtpDiagnostic(MailDeliveryFailure failure) {
        if (failure.smtpStatus() == null) {
            return "";
        }
        String status = failure.smtpStatus().toString();
        if (failure.smtpEnhancedStatus() != null) {
            status += " " + failure.smtpEnhancedStatus();
        }
        return " (SMTP " + status + ")";
    }

    enum Attempt {
        INITIAL("INITIAL_VERIFICATION_FAILED", "/api/v1/producers"),
        RESEND("VERIFICATION_RESEND_FAILED", "/api/v1/auth/email-verifications"),
        ADMIN_RESEND("ADMIN_VERIFICATION_RESEND_FAILED", "/api/v1/admin/members/{memberId}/email-verifications");

        private final String message;
        private final String endpoint;

        Attempt(String message, String endpoint) {
            this.message = message;
            this.endpoint = endpoint;
        }
    }
}
