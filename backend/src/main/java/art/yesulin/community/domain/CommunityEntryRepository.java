package art.yesulin.community.domain;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface CommunityEntryRepository extends JpaRepository<CommunityEntry, Long> {

    @Query("select new art.yesulin.community.domain.CommunityParticipant(e.ownerHash, e.authorMode) "
            + "from CommunityEntry e where e.id = :postId or e.parentId = :postId "
            + "group by e.ownerHash, e.authorMode order by min(e.id)")
    List<CommunityParticipant> authors(long postId);

    Optional<CommunityEntry> findByRequestKey(String requestKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from CommunityEntry e where e.id = :id")
    Optional<CommunityEntry> lockById(long id);

    @Query("select coalesce(e.parentId, e.id) from CommunityEntry e where e.id = :id")
    Optional<Long> findRootId(long id);

    @Query("select e from CommunityEntry e where e.parentId is null and e.deletedAt is null "
            + "and (:topic is null or e.topic = :topic) and e.id < :before order by e.id desc")
    List<CommunityEntry> posts(long before, CommunityTopic topic, Pageable pageable);

    @Query("""
            select new art.yesulin.community.domain.PopularPost(e.id, e.title)
            from CommunityEntry e left join CommunityLike l on l.postId = e.id
            where e.parentId is null and e.deletedAt is null and e.createdAt between :since and :now
            group by e.id, e.title, e.commentCount, e.createdAt
            having count(l.id) + e.commentCount * 2 >= 3
            order by count(l.id) + e.commentCount * 2 desc, e.createdAt desc, e.id desc
            """)
    List<PopularPost> popular(Instant since, Instant now, Pageable pageable);

    @Query("select e from CommunityEntry e where e.parentId = :postId and e.deletedAt is null "
            + "and e.id > :after order by e.id")
    List<CommunityEntry> comments(long postId, long after, Pageable pageable);
}
