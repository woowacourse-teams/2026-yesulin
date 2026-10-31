package art.yesulin.pdfextraction.presentation.event;

import art.yesulin.pdfextraction.application.ai.PdfAiFailedEvent;
import art.yesulin.pdfextraction.application.ai.PdfAiFailureNoticeReader;
import art.yesulin.pdfextraction.application.ai.PdfAiFailureNotifier;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfAiFailureAlertHandler {

    private final PdfAiFailureNoticeReader reader;
    private final PdfAiFailureNotifier notifier;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void failed(PdfAiFailedEvent event) {
        Thread.ofVirtual().name("pdf-ai-failure-alert").start(() -> {
            try {
                reader.find(event.jobId()).ifPresent(notifier::notifyFailure);
            } catch (RuntimeException exception) {
                log.warn("PDF_AI_SLACK_ALERT_FAILED jobId={} exception={}", event.jobId(),
                        exception.getClass().getSimpleName());
            }
        });
    }
}
