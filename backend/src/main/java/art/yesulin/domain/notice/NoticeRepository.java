package art.yesulin.domain.notice;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

    boolean existsBySourceAndExternalId(String source, String externalId);

    List<Notice> findAllBySourceAndExternalIdIn(String source, Collection<String> externalIds);

    Optional<Notice> findBySourceAndExternalId(String source, String externalId);

    List<Notice> findAllBySourceAndStatusOrderByIdAsc(
            String source, NoticeStatus status, Pageable pageable
    );
}
