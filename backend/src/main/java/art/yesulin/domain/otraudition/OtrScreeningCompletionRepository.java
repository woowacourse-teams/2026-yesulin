package art.yesulin.domain.otraudition;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OtrScreeningCompletionRepository extends JpaRepository<OtrScreeningCompletion, Long> {

    boolean existsByOtrAuditionIdAndRoleOrder(long otrAuditionId, int roleOrder);
}
