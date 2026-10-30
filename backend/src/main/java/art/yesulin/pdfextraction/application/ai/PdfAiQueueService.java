package art.yesulin.pdfextraction.application.ai;

import art.yesulin.pdfextraction.application.PdfApplicantInfo;
import art.yesulin.pdfextraction.application.PdfExtractionResult;
import art.yesulin.pdfextraction.domain.PdfExtractionPayload;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiGate;
import art.yesulin.pdfextraction.domain.ai.PdfAiGateRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiJob;
import art.yesulin.pdfextraction.domain.ai.PdfAiJobRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiStatus;
import java.time.Clock;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfAiQueueService {

    private final PdfAiJobRepository jobs;
    private final PdfAiGateRepository gates;
    private final PdfExtractionPayloadRepository payloads;
    private final ObjectMapper mapper;
    private final ApplicationEventPublisher events;
    private final PdfAiProperties properties;
    private final Clock clock;

    // 호출자는 추출 Job을 잠근 콜백 트랜잭션이다. 같은 Job의 결과·AI 작업을 함께 커밋한다.
    @Transactional
    public PdfAiJob enqueue(String jobId, String reviewId, long ownerId, String text, List<PdfAiRole> roles,
                              PdfApplicantInfo legacyInfo) {
        Optional<PdfAiJob> existing = jobs.findById(jobId);
        if (existing.isPresent()) {
            return existing.get();
        }
        Instant now = clock.instant();
        PdfAiJob job = new PdfAiJob(jobId, reviewId, ownerId, mapper.writeValueAsString(roles), now);
        PdfExtractionResult extraction = mapper.readValue(payloads.findById(jobId).orElseThrow()
                .getPayloadJson(), PdfExtractionResult.class);
        if ("FAILED".equals(extraction.status())) {
            job.skip("EXTRACTION_FAILED", now);
        } else if (legacyInfo != null && legacyInfo.completed()) {
            job.skip("LEGACY_COMPLETED", now);
        } else if (!properties.enabled()) {
            job.skip("DISABLED", now);
        } else if (text == null || text.isBlank()) {
            job.skip("NO_TEXT", now);
        } else if (text.codePointCount(0, text.length()) > PdfAiProperties.MAX_TEXT_LENGTH) {
            job.skip("TEXT_LIMIT_EXCEEDED", now);
        }
        PdfAiJob saved = jobs.save(job);
        if (saved.getStatus() == PdfAiStatus.PENDING) {
            events.publishEvent(new PdfAiQueuedEvent(saved.getJobId()));
        } else {
            log.debug("PDF_FLOW stage=AI_SKIP_DECIDED jobId={} reason={}", saved.getJobId(), saved.getErrorCode());
        }
        return saved;
    }

    @Transactional
    public Optional<PdfAiWork> claim() {
        if (!properties.enabled()) {
            return Optional.empty();
        }
        // 모든 서버가 이 행을 먼저 잠근다. count+획득만 같은 트랜잭션에 두는 것으로는 충분하지 않다.
        PdfAiGate gate = gates.lockCapacity().orElseThrow(() ->
                new IllegalStateException("PDF AI capacity gate is missing"));
        Instant now = clock.instant();
        if (!gate.permits(now)) {
            return Optional.empty();
        }
        jobs.findByStatusAndLeaseExpiresAtLessThanEqual(PdfAiStatus.RUNNING, now, PageRequest.of(0, 32))
                .forEach(job -> {
                    job.recoverExpired(properties.maxAttempts(), now);
                    publishIfFailed(job);
                });
        jobs.flush();
        if (jobs.countByStatusAndLeaseExpiresAtAfter(PdfAiStatus.RUNNING, now) >= properties.concurrency()) {
            return Optional.empty();
        }
        return jobs.findByStatusAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAscCreatedAtAsc(
                        PdfAiStatus.PENDING, now, PageRequest.of(0, 1)).stream().findFirst()
                .map(job -> {
                    PdfAiWork work = acquire(job, now);
                    if (work != null) {
                        gate.reserve(now, properties.requestInterval());
                        events.publishEvent(new PdfAiClaimedEvent(work.jobId()));
                    }
                    return work;
                });
    }

    private PdfAiWork acquire(PdfAiJob job, Instant now) {
        String token = job.acquire(now, properties.leaseDuration(), properties.provider(), properties.modelId(),
                PdfAiProperties.PROMPT_VERSION);
        Optional<PdfExtractionPayload> payload = payloads.findById(job.getJobId());
        try {
            String text = mapper.readValue(payload.orElseThrow().getPayloadJson(), PdfExtractionResult.class)
                    .extractedText();
            List<PdfAiRole> roles = Arrays.asList(mapper.readValue(job.getRolesJson(), PdfAiRole[].class));
            return new PdfAiWork(job.getJobId(), token, job.getOwnerId(), text, roles,
                    job.getProvider(), job.getModelId());
        } catch (RuntimeException exception) {
            // DB 조회 실패는 이 catch 바깥이다. 손상된 입력 하나가 전체 대기열을 막지 않게 종료한다.
            job.fail(token, "INVALID_SOURCE", false, properties.maxAttempts(), now);
            publishIfFailed(job);
            return null;
        }
    }

    @Transactional
    public boolean complete(PdfAiWork work, PdfApplicantInfo info) {
        Optional<PdfAiJob> found = jobs.findForUpdate(work.jobId());
        if (found.isEmpty()) {
            return false;
        }
        PdfAiJob job = found.get();
        Instant now = clock.instant();
        if (!job.ownsLease(work.leaseToken(), now)) {
            return false;
        }
        job.complete(work.leaseToken(), mapper.writeValueAsString(info), now);
        // 심사 반영도 같은 트랜잭션이다. 반영 실패 시 결과 저장을 함께 롤백한다.
        events.publishEvent(new PdfAiCompletedEvent(work.jobId(), work.ownerId(), work.text(), info));
        return true;
    }

    @Transactional
    public void fail(PdfAiWork work, PdfAiFailure failure) {
        Optional<PdfAiJob> found = jobs.findForUpdate(work.jobId());
        if (found.isEmpty()) {
            return;
        }
        PdfAiJob job = found.get();
        Instant now = clock.instant();
        if (job.ownsLease(work.leaseToken(), now)) {
            job.fail(work.leaseToken(), failure.code(), failure.retryable(), properties.maxAttempts(), now);
            publishIfFailed(job);
        }
    }

    private void publishIfFailed(PdfAiJob job) {
        if (job.getStatus() == PdfAiStatus.FAILED) {
            events.publishEvent(new PdfAiFailedEvent(job.getJobId(), job.getOwnerId()));
        }
    }
}
