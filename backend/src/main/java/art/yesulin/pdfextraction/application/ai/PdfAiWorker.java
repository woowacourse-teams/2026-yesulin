package art.yesulin.pdfextraction.application.ai;

import art.yesulin.pdfextraction.application.PdfApplicantInfo;
import java.util.Optional;
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

    // 외부 호출에는 DB 트랜잭션/행 잠금을 유지하지 않는다.
    public void tick() {
        Optional<PdfAiWork> next = queue.claim();
        if (next.isEmpty()) {
            return;
        }
        PdfAiWork work = next.get();
        try {
            String response = client.generate(prompt.systemPrompt(), prompt.userPrompt(work.text(), work.roles()));
            PdfApplicantInfo info = parser.parse(response, work.text(), work.roles(),
                    work.provider(), work.modelId());
            queue.complete(work, info);
        } catch (PdfAiFailure failure) {
            queue.fail(work, failure);
            log.warn("PDF_AI_FAILED jobId={} code={} retryable={}", work.jobId(), failure.code(), failure.retryable());
        } catch (RuntimeException exception) {
            queue.fail(work, new PdfAiFailure("PROCESSING_ERROR", true));
            log.warn("PDF_AI_FAILED jobId={} code=PROCESSING_ERROR", work.jobId());
        }
    }
}
