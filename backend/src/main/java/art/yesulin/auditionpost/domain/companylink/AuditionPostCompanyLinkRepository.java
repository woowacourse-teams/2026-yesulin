package art.yesulin.auditionpost.domain.companylink;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditionPostCompanyLinkRepository extends JpaRepository<AuditionPostCompanyLink, Long> {

    Optional<AuditionPostCompanyLink> findBySourceAndSourceAuthorId(String source, String sourceAuthorId);

    List<AuditionPostCompanyLink> findAllByOrderByIdAsc();
}
