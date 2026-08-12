package art.yesulin.infrastructure.company;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyMemberJpaRepository extends JpaRepository<CompanyMemberJpaEntity, Long> {

    List<CompanyMemberJpaEntity> findAllByAccountId(Long accountId);

    Optional<CompanyMemberJpaEntity> findByAccountIdAndCompanyId(Long accountId, Long companyId);

    boolean existsByAccountIdAndCompanyId(Long accountId, Long companyId);
}
