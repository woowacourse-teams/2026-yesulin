package art.yesulin.domain.submission;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionIdempotencyRequestRepository
        extends JpaRepository<SubmissionIdempotencyRequest, Long> {

    Optional<SubmissionIdempotencyRequest> findByApplicantIdAndIdempotencyKey(
            long applicantId,
            UUID idempotencyKey
    );
}
