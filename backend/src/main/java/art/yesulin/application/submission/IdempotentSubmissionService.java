package art.yesulin.application.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.submission.SubmissionErrorCode.IDEMPOTENCY_KEY_REUSED;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.SubmissionIdempotencyRequest;
import art.yesulin.domain.submission.SubmissionIdempotencyRequestRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class IdempotentSubmissionService {

    private final SubmissionService submissionService;
    private final SubmissionIdempotencyRequestRepository idempotencyRepository;
    private final SubmissionRequestFingerprint requestFingerprint;
    private final Clock clock;
    private final TransactionTemplate transaction;

    public IdempotentSubmissionService(
            SubmissionService submissionService,
            SubmissionIdempotencyRequestRepository idempotencyRepository,
            SubmissionRequestFingerprint requestFingerprint,
            Clock clock,
            PlatformTransactionManager transactionManager
    ) {
        this.submissionService = submissionService;
        this.idempotencyRepository = idempotencyRepository;
        this.requestFingerprint = requestFingerprint;
        this.clock = clock;
        this.transaction = new TransactionTemplate(transactionManager);
    }

    public SubmittedSubmissionResult submit(
            long applicantId,
            UUID auditionId,
            UUID idempotencyKey,
            SubmitSubmissionCommand command
    ) {
        long validApplicantId = requirePositive(applicantId, "지원자 ID는 1 이상이어야 합니다.");
        UUID validAuditionId = requireNonNull(auditionId, "지원할 공고 ID는 필수입니다.");
        UUID validIdempotencyKey = requireNonNull(idempotencyKey, "멱등 키는 필수입니다.");
        SubmitSubmissionCommand validCommand = requireNonNull(command, "제출할 지원서는 필수입니다.");
        String requestHash = requestFingerprint.create(validAuditionId, validCommand);

        Optional<SubmissionIdempotencyRequest> existing = idempotencyRepository
                .findByApplicantIdAndIdempotencyKey(validApplicantId, validIdempotencyKey);
        if (existing.isPresent()) {
            return replay(existing.get(), requestHash);
        }

        try {
            return transaction.execute(status -> create(
                    validApplicantId,
                    validAuditionId,
                    validIdempotencyKey,
                    requestHash,
                    validCommand
            ));
        } catch (DataIntegrityViolationException exception) {
            return idempotencyRepository.findByApplicantIdAndIdempotencyKey(
                            validApplicantId,
                            validIdempotencyKey
                    )
                    .map(request -> replay(request, requestHash))
                    .orElseThrow(() -> exception);
        }
    }

    private SubmittedSubmissionResult create(
            long applicantId,
            UUID auditionId,
            UUID idempotencyKey,
            String requestHash,
            SubmitSubmissionCommand command
    ) {
        Instant createdAt = Instant.now(clock);
        SubmissionIdempotencyRequest request = idempotencyRepository.saveAndFlush(
                new SubmissionIdempotencyRequest(applicantId, idempotencyKey, requestHash, createdAt)
        );
        SubmittedSubmissionResult result = submissionService.submit(applicantId, auditionId, command);
        request.complete(result.submissionId(), result.submittedAt());
        return result;
    }

    private SubmittedSubmissionResult replay(SubmissionIdempotencyRequest request, String requestHash) {
        if (!request.hasSameRequestHash(requestHash)) {
            throw new BusinessException(
                    IDEMPOTENCY_KEY_REUSED,
                    "같은 멱등 키를 다른 지원서 요청에 사용할 수 없습니다."
            );
        }
        UUID submissionId = requireNonNull(request.getSubmissionId(), "완료된 멱등 요청의 지원서 ID는 필수입니다.");
        Instant submittedAt = requireNonNull(request.getSubmittedAt(), "완료된 멱등 요청의 제출 시각은 필수입니다.");
        return new SubmittedSubmissionResult(submissionId, submittedAt);
    }
}
