package art.yesulin.community.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "community_comment_notices")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CommunityCommentNotice {

    @Id
    private Long commentId;
    private long recipientId;
    private boolean seen;

    public CommunityCommentNotice(long commentId, long recipientId) {
        this.commentId = commentId;
        this.recipientId = recipientId;
    }
}
