package art.yesulin.community.domain;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface CommunityCommentNoticeRepository extends JpaRepository<CommunityCommentNotice, Long> {

    @Query("select new art.yesulin.community.domain.CommunityInboxItem(c.id, p.id, p.title, c.replyToId, n.seen) "
            + "from CommunityCommentNotice n join CommunityEntry c on c.id = n.commentId "
            + "join CommunityEntry p on p.id = c.parentId where n.recipientId = :member "
            + "and c.deletedAt is null and p.deletedAt is null order by c.id desc")
    List<CommunityInboxItem> inbox(long member, Pageable page);

    @Modifying
    @Query("update CommunityCommentNotice n set n.seen = true where n.commentId = :id and n.recipientId = :member")
    void markSeen(long member, long id);
}
