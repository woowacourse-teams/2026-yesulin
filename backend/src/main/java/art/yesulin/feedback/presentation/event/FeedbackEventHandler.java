package art.yesulin.feedback.presentation.event;

import art.yesulin.feedback.application.FeedbackNotifier;
import art.yesulin.feedback.application.FeedbackSubmittedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class FeedbackEventHandler {

    private final FeedbackNotifier notifier;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(FeedbackSubmittedEvent event) {
        notifier.notifySubmitted(event);
    }
}
