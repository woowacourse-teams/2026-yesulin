package art.yesulin.auditionpost.domain.notice;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("update Notice n set n.openChatVisitCount = n.openChatVisitCount + :amount"
            + " where n.source = :source and n.externalId = :externalId")
    int addOpenChatVisitCount(
            @Param("source") String source, @Param("externalId") String externalId, @Param("amount") long amount);

    boolean existsBySourceAndExternalId(String source, String externalId);

    List<Notice> findAllBySourceAndExternalIdIn(String source, Collection<String> externalIds);

    Optional<Notice> findBySourceAndExternalId(String source, String externalId);

    List<Notice> findAllBySourceAndStatusOrderByIdAsc(
            String source, NoticeStatus status, Pageable pageable
    );
}
