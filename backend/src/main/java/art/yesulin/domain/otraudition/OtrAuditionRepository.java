package art.yesulin.domain.otraudition;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OtrAuditionRepository extends JpaRepository<OtrAudition, Long> {

    boolean existsByOwnerIdAndOtrId(long ownerId, String otrId);

    List<OtrAudition> findAllByOwnerIdOrderByCreatedAtDescIdDesc(long ownerId);

    Optional<OtrAudition> findByPublicId(UUID publicId);
}
