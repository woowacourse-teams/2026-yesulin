package art.yesulin.pdfextraction.application.ai;

import art.yesulin.pdfextraction.application.PdfApplicantInfo;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(prefix = "yesulin.pdf-ai", name = "enabled", havingValue = "true")
public class PdfAiWorker {

    private final PdfAiQueueService queue;
    private final PdfAiClient client;
    private final PdfAiPrompt prompt;
    private final PdfAiResponseParser parser;
    private final PdfAiDiagnostics diagnostics;

    // 외부 호출에는 DB 트랜잭션/행 잠금을 유지하지 않는다.
    public boolean tick() {
        Optional<PdfAiWork> next = queue.claim();
        if (next.isEmpty()) {
            return false;
        }
        PdfAiWork work = next.get();
        long started = System.nanoTime();
        log.debug("PDF_FLOW stage=AI_REQUEST_STARTED jobId={}", work.jobId());
        try {
            String response = diagnostics.withJob(work.jobId(),
                    () -> client.generate(prompt.systemPrompt(), prompt.userPrompt(work.text(), work.roles())));
            log.debug("PDF_FLOW stage=AI_RESPONSE_RECEIVED jobId={} elapsedMs={}", work.jobId(), elapsed(started));
            PdfApplicantInfo info = parser.parse(response, work.text(), work.roles(),
                    work.provider(), work.modelId());
            if (queue.complete(work, info)) {
                log.debug("PDF_FLOW stage=AI_COMPLETED jobId={} elapsedMs={}", work.jobId(), elapsed(started));
            } else {
                log.debug("PDF_FLOW stage=RESULT_IGNORED jobId={} reason=STALE_OR_DELETED", work.jobId());
            }
        } catch (PdfAiFailure failure) {
            diagnostics.failed(work.jobId(), failure.reason());
            queue.fail(work, failure);
            log.debug("PDF_FLOW stage=AI_ATTEMPT_FAILED jobId={} code={} retryable={} elapsedMs={}",
                    work.jobId(), failure.code(), failure.retryable(), elapsed(started));
            log.warn("PDF_AI_FAILED jobId={} code={} retryable={}", work.jobId(), failure.code(), failure.retryable());
        } catch (RuntimeException exception) {
            queue.fail(work, new PdfAiFailure("PROCESSING_ERROR", true));
            log.debug("PDF_FLOW stage=AI_ATTEMPT_FAILED jobId={} code=PROCESSING_ERROR elapsedMs={}",
                    work.jobId(), elapsed(started));
            log.warn("PDF_AI_FAILED jobId={} code=PROCESSING_ERROR", work.jobId());
        }
        return true;
    }

    private long elapsed(long started) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
    }
}
