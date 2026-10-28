package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_EXTRACTION_NOT_FOUND;
import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.PDF_EXTRACTION_RESULT_CONFLICT;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayload;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.HexFormat;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfExtractionResultReceiver {

    private final PdfExtractionJobRepository jobs;
    private final PdfExtractionPayloadRepository payloads;
    private final PdfExtractionResultParser parser;
    private final PdfExtractionStorage storage;
    private final ApplicationEventPublisher events;
    private final ObjectMapper mapper;
    private final Clock clock;

    @Transactional
    public Receipt receive(ReceivePdfExtractionResultCommand command) {
        PdfExtractionJob job = jobs.findForUpdate(command.jobId()).orElseThrow(() ->
                new BusinessException(PDF_EXTRACTION_NOT_FOUND, "PDF 추출 작업을 찾을 수 없습니다."));
        if (job.isDeleted()) {
            // 배우가 닫았거나 보관 기간이 지나 지운 작업이다. 늦게 온 결과는 저장하지 않고 워커가 남긴 객체를 다시 지운다.
            storage.deleteAll(job);
            return new Receipt(job.getId(), job.getStatus().name());
        }
        PdfExtractionResult result = parser.parse(job, command);
        String payloadJson = mapper.writeValueAsString(result);
        String digest = sha256(payloadJson);
        Optional<PdfExtractionPayload> stored = payloads.findById(job.getId());
        if (stored.isPresent()) {
            if (!stored.get().hasSameDigest(digest)) {
                throw new BusinessException(PDF_EXTRACTION_RESULT_CONFLICT, "이미 다른 PDF 추출 결과가 저장되어 있습니다.");
            }
            return new Receipt(job.getId(), job.getStatus().name());
        }
        payloads.save(new PdfExtractionPayload(job.getId(), payloadJson, digest, clock.instant()));
        job.receiveResult(result.status(), clock.instant());
        job.recordDailyQuotaUse(result.hasProfileProposal());
        events.publishEvent(new PdfExtractionCompletedEvent(job.getId(), job.getOwnerId(), result.extractedText(),
                result.applicantInfo()));
        return new Receipt(job.getId(), job.getStatus().name());
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
