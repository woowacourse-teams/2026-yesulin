package art.yesulin.pdfextraction.presentation.event;

import art.yesulin.pdfextraction.application.ai.PdfAiCircuitBlockedEvent;
import art.yesulin.pdfextraction.application.ai.PdfAiCircuitChangedEvent;
import art.yesulin.pdfextraction.application.ai.PdfAiJobMetricEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@Slf4j
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfAiResilienceMetricHandler {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void job(PdfAiJobMetricEvent event) {
        log.atInfo().addKeyValue("event", "PDF_AI_RESILIENCE").addKeyValue("kind", "JOB_STATE")
                .addKeyValue("jobId", event.jobId()).addKeyValue("generation", event.generation())
                .addKeyValue("modelId", event.modelId()).addKeyValue("outcome", event.outcome())
                .addKeyValue("attempts", event.attempts()).addKeyValue("escalated", event.escalated())
                .addKeyValue("elapsedMs", event.elapsedMs()).log("PDF_AI_RESILIENCE");
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void circuit(PdfAiCircuitChangedEvent event) {
        log.atInfo().addKeyValue("event", "PDF_AI_RESILIENCE").addKeyValue("kind", "CIRCUIT_STATE")
                .addKeyValue("modelId", event.modelId()).addKeyValue("state", event.state())
                .log("PDF_AI_RESILIENCE");
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void blocked(PdfAiCircuitBlockedEvent event) {
        log.atInfo().addKeyValue("event", "PDF_AI_RESILIENCE").addKeyValue("kind", "CALL_SKIPPED")
                .addKeyValue("modelId", event.modelId())
                .log("PDF_AI_RESILIENCE");
    }
}
