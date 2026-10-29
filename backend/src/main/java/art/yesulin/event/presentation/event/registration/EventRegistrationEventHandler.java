package art.yesulin.event.presentation.event.registration;

import art.yesulin.event.application.registration.EventRegisteredEvent;
import art.yesulin.event.application.registration.EventRegistrationNotifier;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class EventRegistrationEventHandler {

    private final EventRegistrationNotifier notifier;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(EventRegisteredEvent event) {
        notifier.notifyRegistered(event);
    }
}
