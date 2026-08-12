package art.yesulin.infrastructure.application;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationJpaRepository extends JpaRepository<ApplicationJpaEntity, Long> {

    boolean existsByApplicantIdAndPostingId(Long applicantId, Long postingId);

    List<ApplicationJpaEntity> findAllByApplicantIdOrderBySubmittedAtDesc(Long applicantId);

    Optional<ApplicationJpaEntity> findByIdAndApplicantId(Long id, Long applicantId);
}
