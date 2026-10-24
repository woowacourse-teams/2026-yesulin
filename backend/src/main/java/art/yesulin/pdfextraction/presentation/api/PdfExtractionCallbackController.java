package art.yesulin.pdfextraction.presentation.api;

import art.yesulin.pdfextraction.application.PdfExtractionResultReceiver;
import art.yesulin.pdfextraction.application.ReceivePdfExtractionResultCommand;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/v1/pdf-extractions")
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfExtractionCallbackController {

    private final PdfExtractionResultReceiver receiver;

    @PostMapping("/completions")
    public ResponseEntity<PdfExtractionResultReceiver.Receipt> complete(
            @Valid @RequestBody CompletePdfExtractionRequest request
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(receiver.receive(
                new ReceivePdfExtractionResultCommand(request.jobId().toString(), request.sourceFileKey(),
                        request.pipelineVersion(), request.result())));
    }
}
