package art.yesulin.actor.domain.bookmark;

import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProducerActorBookmarkRepository extends JpaRepository<ProducerActorBookmark, Long> {

    boolean existsByProducerMemberIdAndActorPageId(long producerMemberId, long actorPageId);

    long countByProducerMemberId(long producerMemberId);

    @Modifying
    @Query("""
            delete from ProducerActorBookmark bookmark
            where bookmark.producerMemberId = :producerMemberId and bookmark.actorPageId = :actorPageId
            """)
    int deleteSaved(@Param("producerMemberId") long producerMemberId, @Param("actorPageId") long actorPageId);

    /** 버튼 상태용이라 숨겨진 저장도 포함한다. */
    @Query("""
            select page.publicId from ProducerActorBookmark bookmark
            join ActorPage page on page.id = bookmark.actorPageId
            where bookmark.producerMemberId = :producerMemberId
            order by bookmark.createdAt desc, bookmark.id desc
            """)
    List<UUID> findSavedPublicIds(@Param("producerMemberId") long producerMemberId);

    /** 배우 목록과 같은 기준(공개 중이고 잠기지 않음)으로 보이는 저장만, 저장한 최신순으로 읽는다. */
    @Query(value = """
            select page from ProducerActorBookmark bookmark
            join ActorPage page on page.id = bookmark.actorPageId
            where bookmark.producerMemberId = :producerMemberId and page.status = :status and page.lockedAt is null
            order by bookmark.createdAt desc, bookmark.id desc
            """, countQuery = """
            select count(bookmark) from ProducerActorBookmark bookmark
            join ActorPage page on page.id = bookmark.actorPageId
            where bookmark.producerMemberId = :producerMemberId and page.status = :status and page.lockedAt is null
            """)
    Page<ActorPage> findListedPages(
            @Param("producerMemberId") long producerMemberId,
            @Param("status") ActorPageStatus status,
            Pageable pageable
    );
}
