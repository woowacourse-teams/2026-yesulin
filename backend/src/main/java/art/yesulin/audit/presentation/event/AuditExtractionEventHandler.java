package art.yesulin.audit.presentation.event;

import art.yesulin.audit.application.AuditExtractionService;
import art.yesulin.pdfextraction.application.PdfExtractionCompletedEvent;
import art.yesulin.pdfextraction.application.PdfExtractionUploadedEvent;
import art.yesulin.pdfextraction.application.ai.PdfAiCompletedEvent;
import art.yesulin.pdfextraction.application.ai.PdfAiFailedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class AuditExtractionEventHandler {

    private final AuditExtractionService service;

    // 커밋 뒤가 아니라 콜백과 같은 트랜잭션에서 반영한다. 예외는 삼키지 않아 콜백이 롤백되고 재시도된다.
    @EventListener
    public void handle(PdfExtractionCompletedEvent event) {
        service.applyExtraction(event.jobId(), event.ownerId(), event.text(), event.applicantInfo());
    }

    @EventListener
    public void uploaded(PdfExtractionUploadedEvent event) {
        service.startExtraction(event.jobId());
    }

    @EventListener
    public void handleAi(PdfAiCompletedEvent event) {
        service.applyAi(event.jobId(), event.ownerId(), event.text(), event.info());
    }

    @EventListener
    public void handleAiFailure(PdfAiFailedEvent event) {
        service.applyAiFailure(event.jobId());
    }
}
