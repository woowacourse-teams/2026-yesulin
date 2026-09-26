package art.yesulin.domain.show;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShowRepository extends JpaRepository<Show, Long> {

    Optional<Show> findByPublicId(UUID publicId);

    List<Show> findAllByStatusOrderByCreatedAtDescIdDesc(ShowStatus status);

    List<Show> findAllByOrderByCreatedAtDescIdDesc();
}
