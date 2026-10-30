package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_EXTRACTION_NOT_FOUND;
import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_EXTRACTION_RESULT_CONFLICT;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.application.ai.PdfAiQueueService;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayload;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiJob;
import art.yesulin.pdfextraction.domain.ai.PdfAiStatus;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfExtractionResultReceiver {

    private final PdfExtractionJobRepository jobs;
    private final PdfExtractionPayloadRepository payloads;
    private final PdfExtractionResultParser parser;
    private final PdfExtractionStorage storage;
    private final ApplicationEventPublisher events;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final PdfAiQueueService aiQueue;

    @Transactional
    public Receipt receive(ReceivePdfExtractionResultCommand command) {
        PdfExtractionJob job = jobs.findForUpdate(command.jobId()).orElseThrow(() ->
                new BusinessException(PDF_EXTRACTION_NOT_FOUND, "PDF 추출 작업을 찾을 수 없습니다."));
        log.debug("PDF_FLOW stage=EXTRACTION_RECEIVED jobId={}", job.getId());
        if (job.isDeleted()) {
            // 배우가 닫았거나 보관 기간이 지나 지운 작업이다. 늦게 온 결과는 저장하지 않고 워커가 남긴 객체를 다시 지운다.
            storage.deleteAll(job);
            log.debug("PDF_FLOW stage=RESULT_IGNORED jobId={} reason=DELETED", job.getId());
            return new Receipt(job.getId(), job.getStatus().name());
        }
        PdfExtractionResult result = parser.parse(job, command);
        if (job.getSourceSha256() == null && job.getReviewId() != null
                && result.sourceSha256() != null && result.sourceSha256().matches("[0-9a-f]{64}")
                && !jobs.existsByReviewIdAndSourceSha256(job.getReviewId(), result.sourceSha256())) {
            job.identifySourceSha256(result.sourceSha256());
        }
        String payloadJson = mapper.writeValueAsString(result);
        String digest = sha256(payloadJson);
        Optional<PdfExtractionPayload> stored = payloads.findById(job.getId());
        if (stored.isPresent()) {
            if (!stored.get().hasSameDigest(digest)) {
                throw new BusinessException(PDF_EXTRACTION_RESULT_CONFLICT, "이미 다른 PDF 추출 결과가 저장되어 있습니다.");
            }
            log.debug("PDF_FLOW stage=CALLBACK_REUSED jobId={}", job.getId());
            return new Receipt(job.getId(), job.getStatus().name());
        }
        payloads.save(new PdfExtractionPayload(job.getId(), payloadJson, digest, clock.instant()));
        if (job.isActorProfile()) {
            job.confirmUpload(clock.instant());
            PdfAiJob aiJob = aiQueue.enqueue(job.getId(), null, job.getOwnerId(), result.extractedText(),
                    List.of(), result.applicantInfo());
            if (aiJob.getStatus() != PdfAiStatus.PENDING && aiJob.getStatus() != PdfAiStatus.RUNNING) {
                finish(job, result);
            }
        } else {
            finish(job, result);
        }
        events.publishEvent(new PdfExtractionCompletedEvent(job.getId(), job.getOwnerId(), result.extractedText(),
                result.applicantInfo()));
        return new Receipt(job.getId(), job.getStatus().name());
    }

    private void finish(PdfExtractionJob job, PdfExtractionResult result) {
        job.receiveResult(result.status(), clock.instant());
        job.recordDailyQuotaUse(result.hasProfileProposal());
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("PDF 추출 결과 hash를 생성할 수 없습니다.", exception);
        }
    }

    public record Receipt(String jobId, String status) {
    }
}
