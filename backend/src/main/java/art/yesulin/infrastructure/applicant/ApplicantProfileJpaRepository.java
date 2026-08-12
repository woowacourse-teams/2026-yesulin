package art.yesulin.infrastructure.applicant;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicantProfileJpaRepository
        extends JpaRepository<ApplicantProfileJpaEntity, Long> {

    Optional<ApplicantProfileJpaEntity> findByApplicantId(Long applicantId);
}
