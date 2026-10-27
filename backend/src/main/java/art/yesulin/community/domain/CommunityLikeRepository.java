package art.yesulin.community.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CommunityLikeRepository extends JpaRepository<CommunityLike, Long> {

    boolean existsByPostIdAndOwnerHash(long postId, String ownerHash);

    Optional<CommunityLike> findByPostIdAndOwnerHash(long postId, String ownerHash);

    long countByPostId(long postId);

    @Query("select l.postId as postId, count(l) as total from CommunityLike l "
            + "where l.postId in :postIds group by l.postId")
    List<Count> counts(List<Long> postIds);

    @Query("select l.postId from CommunityLike l where l.postId in :postIds and l.ownerHash = :owner")
    List<Long> likedPosts(List<Long> postIds, String owner);

    interface Count {
        long getPostId();

        long getTotal();
    }
}
