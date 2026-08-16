package art.yesulin.presentation.event.performance;

import art.yesulin.application.file.FileService;
import art.yesulin.domain.performance.event.PerformanceCreatedEvent;
import art.yesulin.domain.performance.event.PerformancePosterChangedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class PerformanceFileEventHandler {

    private final FileService fileService;

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void handle(PerformanceCreatedEvent event) {
        fileService.confirmReference(event.ownerId(), event.posterFileId());
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void handle(PerformancePosterChangedEvent event) {
        fileService.confirmReference(event.ownerId(), event.currentPosterFileId());
    }
}
