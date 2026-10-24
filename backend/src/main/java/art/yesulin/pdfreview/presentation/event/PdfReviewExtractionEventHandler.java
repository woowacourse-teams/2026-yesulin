package art.yesulin.pdfreview.presentation.event;

import art.yesulin.pdfextraction.application.PdfExtractionCompletedEvent;
import art.yesulin.pdfreview.application.PdfReviewExtractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfReviewExtractionEventHandler {

    private final PdfReviewExtractionService service;

    // 커밋 뒤가 아니라 콜백과 같은 트랜잭션에서 반영한다. 예외는 삼키지 않아 콜백이 롤백되고 재시도된다.
    @EventListener
    public void handle(PdfExtractionCompletedEvent event) {
        service.applyExtraction(event.jobId(), event.ownerId(), event.text());
    }
}
