package art.yesulin.pdfextraction.presentation.event;

import art.yesulin.pdfextraction.application.PdfExtractionCompletedEvent;
import art.yesulin.pdfextraction.application.ai.PdfAiClaimedEvent;
import art.yesulin.pdfextraction.application.ai.PdfAiQueuedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@Slf4j
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfFlowEventHandler {

    @Order(0)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void extracted(PdfExtractionCompletedEvent event) {
        log.debug("PDF_FLOW stage=EXTRACTION_COMMITTED jobId={}", event.jobId());
    }

    @Order(1)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void queued(PdfAiQueuedEvent event) {
        log.debug("PDF_FLOW stage=AI_READY jobId={}", event.jobId());
    }

    @Order(0)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void claimed(PdfAiClaimedEvent event) {
        log.debug("PDF_FLOW stage=AI_CLAIMED jobId={}", event.jobId());
    }
}
