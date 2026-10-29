package art.yesulin.pdfreview.presentation.api;

import art.yesulin.pdfreview.application.PdfReviewWorkerContext;
import art.yesulin.pdfreview.application.PdfReviewWorkerContextService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 서버 간 Bearer 보안 체인이 보호하는 경로다. 브라우저 회원 인증을 쓰지 않는다. */
@RestController
@RequestMapping("/internal/v1/pdf-extractions")
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfReviewWorkerController {

    private final PdfReviewWorkerContextService service;

    @GetMapping("/{jobId}/review-context")
    public ResponseEntity<PdfReviewWorkerContext> reviewContext(@PathVariable String jobId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.find(jobId));
    }
}
