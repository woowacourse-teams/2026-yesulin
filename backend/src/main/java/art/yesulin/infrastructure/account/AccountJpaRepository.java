package art.yesulin.infrastructure.account;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountJpaRepository extends JpaRepository<AccountJpaEntity, Long> {

    Optional<AccountJpaEntity> findByEmail(String email);

    boolean existsByEmail(String email);
}
