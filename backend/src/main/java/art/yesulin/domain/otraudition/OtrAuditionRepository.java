package art.yesulin.domain.otraudition;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface OtrAuditionRepository extends JpaRepository<OtrAudition, Long> {

    boolean existsByOwnerIdAndOtrId(long ownerId, String otrId);

    List<OtrAudition> findAllByOwnerIdOrderByCreatedAtDescIdDesc(long ownerId);

    Optional<OtrAudition> findByPublicId(UUID publicId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<OtrAudition> findForUpdateByPublicId(UUID publicId);

    Optional<OtrAudition> findByPublicIdAndOwnerId(UUID publicId, long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<OtrAudition> findForUpdateByPublicIdAndOwnerId(UUID publicId, long ownerId);
}
