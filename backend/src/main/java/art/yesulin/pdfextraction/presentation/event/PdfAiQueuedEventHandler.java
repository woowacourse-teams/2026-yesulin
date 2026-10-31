package art.yesulin.pdfextraction.presentation.event;

import art.yesulin.pdfextraction.application.ai.PdfAiClaimedEvent;
import art.yesulin.pdfextraction.application.ai.PdfAiDispatcher;
import art.yesulin.pdfextraction.application.ai.PdfAiQueuedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-ai", name = "enabled", havingValue = "true")
public class PdfAiQueuedEventHandler {

    private final PdfAiDispatcher dispatcher;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void queued(PdfAiQueuedEvent event) {
        dispatcher.wakeUp();
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void claimed(PdfAiClaimedEvent event) {
        dispatcher.wakeUpAfterInterval();
    }
}
