package art.yesulin.pdfextraction.presentation.api;

import art.yesulin.pdfextraction.application.DocumentPreviewReceiver;
import art.yesulin.pdfextraction.application.DocumentPreviewTransferStorage.Transfer;
import art.yesulin.pdfextraction.application.DocumentPreviewTransfers;
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

    private final DocumentPreviewReceiver previews;

    private final DocumentPreviewTransfers transfers;

    @PostMapping("/preview-transfers")
    public ResponseEntity<Transfer> prepareTransfer(@Valid @RequestBody DocumentPreviewTransfers.Request request) {
        return transfers.prepare(request).map(transfer -> ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(transfer)).orElseGet(() -> ResponseEntity.noContent().cacheControl(CacheControl.noStore())
                .build());
    }

    @PostMapping("/previews")
    public ResponseEntity<Void> acceptPreview(@Valid @RequestBody CompleteDocumentPreviewRequest request) {
        previews.receive(request.toCommand());
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    @PostMapping("/completions")
    public ResponseEntity<PdfExtractionResultReceiver.Receipt> complete(
            @Valid @RequestBody CompletePdfExtractionRequest request
    ) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(receiver.receive(
                new ReceivePdfExtractionResultCommand(request.jobId().toString(), request.sourceFileKey(),
                        request.pipelineVersion(), request.result())));
    }
}
