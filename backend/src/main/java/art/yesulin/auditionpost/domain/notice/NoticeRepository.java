package art.yesulin.auditionpost.domain.notice;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

    @Modifying(clearAutomatically = true)
    @Query("update Notice n set n.openChatVisitCount = n.openChatVisitCount + 1"
            + " where n.source = :source and n.externalId = :externalId")
    int increaseOpenChatVisitCount(@Param("source") String source, @Param("externalId") String externalId);

    boolean existsBySourceAndExternalId(String source, String externalId);

    List<Notice> findAllBySourceAndExternalIdIn(String source, Collection<String> externalIds);

    Optional<Notice> findBySourceAndExternalId(String source, String externalId);

    List<Notice> findAllBySourceAndStatusOrderByIdAsc(
            String source, NoticeStatus status, Pageable pageable
    );
}
