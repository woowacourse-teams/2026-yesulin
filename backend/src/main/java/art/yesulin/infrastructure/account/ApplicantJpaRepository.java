package art.yesulin.infrastructure.account;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicantJpaRepository extends JpaRepository<ApplicantJpaEntity, Long> {

    Optional<ApplicantJpaEntity> findByAccountId(Long accountId);
}
