package art.yesulin.auditionpost.presentation.event;

import art.yesulin.auditionpost.application.ProducerAuditionPostEditedEvent;
import art.yesulin.auditionpost.application.ProducerAuditionPostNotifier;
import art.yesulin.auditionpost.application.ProducerAuditionPostPublishedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** 커밋된 기획사 공고만 운영자에게 알린다. 저장이 롤백되면 알리지 않는다. */
@Component
@RequiredArgsConstructor
public class ProducerAuditionPostEventHandler {

    private final ProducerAuditionPostNotifier notifier;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(ProducerAuditionPostPublishedEvent event) {
        notifier.notifyPublished(event);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(ProducerAuditionPostEditedEvent event) {
        notifier.notifyEdited(event);
    }
}
