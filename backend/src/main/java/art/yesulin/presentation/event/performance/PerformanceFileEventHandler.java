package art.yesulin.presentation.event.performance;

import art.yesulin.application.file.FileReferenceCommand;
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

    private static final String REFERENCE_TYPE = "PERFORMANCE";
    private static final String POSTER_SLOT = "POSTER";

    private final FileService fileService;

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void handle(PerformanceCreatedEvent event) {
        FileReferenceCommand command = createPosterReferenceCommand(event.performanceId());
        fileService.addReference(event.ownerId(), event.posterFileId(), command);
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void handle(PerformancePosterChangedEvent event) {
        FileReferenceCommand command = createPosterReferenceCommand(event.performanceId());
        fileService.replaceReference(
                event.ownerId(), event.previousPosterFileId(), event.currentPosterFileId(), command
        );
    }

    private FileReferenceCommand createPosterReferenceCommand(long performanceId) {
        return new FileReferenceCommand(REFERENCE_TYPE, performanceId, POSTER_SLOT);
    }
}
