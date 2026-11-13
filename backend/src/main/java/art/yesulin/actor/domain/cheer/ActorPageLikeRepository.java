package art.yesulin.actor.domain.cheer;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ActorPageLikeRepository extends JpaRepository<ActorPageLike, Long> {

    boolean existsByActorPageIdAndMemberId(long actorPageId, long memberId);

    long countByActorPageId(long actorPageId);

    @Modifying
    @Query("""
            delete from ActorPageLike pageLike
            where pageLike.actorPageId = :actorPageId and pageLike.memberId = :memberId
            """)
    int deleteLike(@Param("actorPageId") long actorPageId, @Param("memberId") long memberId);
}
