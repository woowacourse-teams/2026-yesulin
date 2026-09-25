package art.yesulin.domain.otraudition;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OtrScreeningReviewRepository extends JpaRepository<OtrScreeningReview, Long> {

    List<OtrScreeningReview> findAllByOtrAuditionIdAndRoleOrder(long otrAuditionId, int roleOrder);

    Optional<OtrScreeningReview> findByOtrSubmissionIdAndRoleOrder(long otrSubmissionId, int roleOrder);
}
