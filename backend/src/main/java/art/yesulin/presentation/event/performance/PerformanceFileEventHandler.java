package art.yesulin.presentation.event.performance;

import art.yesulin.application.file.FileReferenceService;
import art.yesulin.application.file.LinkFileCommand;
import art.yesulin.application.file.ReplaceLinkedFileCommand;
import art.yesulin.domain.performance.event.PerformanceCreatedEvent;
import art.yesulin.domain.performance.event.PerformancePosterChangedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class PerformanceFileEventHandler {

    private static final String REFERENCE_TYPE = "PERFORMANCE_POSTER";

    private final FileReferenceService fileReferenceService;

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void handle(PerformanceCreatedEvent event) {
        LinkFileCommand command = new LinkFileCommand(
                event.ownerId(), event.posterFileId(), REFERENCE_TYPE, event.performanceId()
        );
        fileReferenceService.linkFile(command);
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void handle(PerformancePosterChangedEvent event) {
        ReplaceLinkedFileCommand command = new ReplaceLinkedFileCommand(
                event.ownerId(), event.previousPosterFileId(), event.currentPosterFileId(),
                REFERENCE_TYPE, event.performanceId()
        );
        fileReferenceService.replaceLinkedFile(command);
    }
}
