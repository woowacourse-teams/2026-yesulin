package art.yesulin.domain.submission;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionConsentRepository extends JpaRepository<SubmissionConsent, Long> {

    List<SubmissionConsent> findAllBySubmissionId(UUID submissionId);

    void deleteBySubmissionId(UUID submissionId);
}
