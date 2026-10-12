package art.yesulin.auditionpost.domain.authorlink;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditionPostAuthorLinkRepository extends JpaRepository<AuditionPostAuthorLink, Long> {

    Optional<AuditionPostAuthorLink> findBySourceAndSourceAuthorId(String source, String sourceAuthorId);

    List<AuditionPostAuthorLink> findAllByOrderByIdAsc();
}
