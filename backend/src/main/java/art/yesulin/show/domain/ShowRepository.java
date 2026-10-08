package art.yesulin.show.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShowRepository extends JpaRepository<Show, Long> {

    Optional<Show> findByPublicId(UUID publicId);

    Optional<Show> findByPublicIdAndOwnerId(UUID publicId, long ownerId);

    List<Show> findAllByOwnerIdOrderByCreatedAtDescIdDesc(long ownerId);

    List<Show> findAllByStatusOrderByCreatedAtDescIdDesc(ShowStatus status);
}
