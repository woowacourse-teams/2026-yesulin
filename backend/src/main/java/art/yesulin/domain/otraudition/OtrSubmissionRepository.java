package art.yesulin.domain.otraudition;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OtrSubmissionRepository extends JpaRepository<OtrSubmission, Long> {

    boolean existsByOtrAuditionIdAndApplicantId(long otrAuditionId, long applicantId);
}
