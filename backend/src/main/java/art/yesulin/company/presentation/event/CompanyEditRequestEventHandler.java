package art.yesulin.company.presentation.event;

import art.yesulin.company.application.editrequest.CompanyEditRequestNotifier;
import art.yesulin.company.application.editrequest.CompanyEditRequestedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** 저장된 수정 요청만 운영자에게 알린다. */
@Component
@RequiredArgsConstructor
public class CompanyEditRequestEventHandler {

    private final CompanyEditRequestNotifier notifier;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(CompanyEditRequestedEvent event) {
        notifier.notifyRequested(event);
    }
}
