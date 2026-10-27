package art.yesulin.community.domain;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface CommunityEntryRepository extends JpaRepository<CommunityEntry, Long> {

    Optional<CommunityEntry> findByRequestKey(String requestKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from CommunityEntry e where e.id = :id")
    Optional<CommunityEntry> lockById(long id);

    @Query("select coalesce(e.parentId, e.id) from CommunityEntry e where e.id = :id")
    Optional<Long> findRootId(long id);

    @Query("select e from CommunityEntry e where e.parentId is null and e.deletedAt is null "
            + "and e.id < :before order by e.id desc")
    List<CommunityEntry> posts(long before, Pageable pageable);

    @Query("select e from CommunityEntry e where e.parentId = :postId and e.deletedAt is null "
            + "and e.id > :after order by e.id")
    List<CommunityEntry> comments(long postId, long after, Pageable pageable);
}
