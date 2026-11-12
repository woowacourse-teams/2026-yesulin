package art.yesulin.actor.domain.cheer;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ActorPageCheerRepository extends JpaRepository<ActorPageCheer, Long> {

    /** 수정과 삭제가 겹쳐 지운 글이 되살아나지 않도록 글 행을 잠가 읽는다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select cheer from ActorPageCheer cheer where cheer.id = :id and cheer.actorPageId = :actorPageId")
    Optional<ActorPageCheer> findForUpdate(@Param("id") long id, @Param("actorPageId") long actorPageId);

    long countByActorPageIdAndDeletedAtIsNull(long actorPageId);

    /** 지우지 않은 응원 글을 최신순으로 읽는다. before보다 앞선 글만 담는다. */
    @Query("""
            select cheer from ActorPageCheer cheer
            where cheer.actorPageId = :actorPageId and cheer.deletedAt is null and cheer.id < :before
            order by cheer.id desc
            """)
    List<ActorPageCheer> findVisibleBefore(
            @Param("actorPageId") long actorPageId, @Param("before") long before, Pageable pageable
    );

    /** 삭제한 글까지 포함해, 처음 응원한 순서대로 작성 회원을 준다. */
    @Query("""
            select cheer.authorMemberId from ActorPageCheer cheer
            where cheer.actorPageId = :actorPageId
            group by cheer.authorMemberId
            order by min(cheer.id)
            """)
    List<Long> findAuthorsInFirstCheerOrder(@Param("actorPageId") long actorPageId);
}
