package art.yesulin.pdfextraction.presentation.event;

import art.yesulin.pdfextraction.application.PdfActorProfileCompletionService;
import art.yesulin.pdfextraction.application.ai.PdfAiCompletedEvent;
import art.yesulin.pdfextraction.application.ai.PdfAiFailedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfActorProfileEventHandler {

    private final PdfActorProfileCompletionService service;

    @EventListener
    public void completed(PdfAiCompletedEvent event) {
        service.finish(event.jobId());
    }

    @EventListener
    public void failed(PdfAiFailedEvent event) {
        service.finish(event.jobId());
    }
}
