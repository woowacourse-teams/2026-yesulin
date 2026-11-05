package art.yesulin.community.domain;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "community_entries")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CommunityEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long parentId;

    @Column(updatable = false)
    private Long replyToId;

    @Column(updatable = false)
    private Long memberId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private CommunityAuthorMode authorMode = CommunityAuthorMode.ANONYMOUS;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private CommunityTopic topic;

    @Column(length = 100)
    private String title;

    @Column(nullable = false, length = 5000)
    private String body;

    @Column(nullable = false, length = 64, updatable = false)
    private String ownerHash;

    @Column(nullable = false, length = 36, unique = true, updatable = false)
    private String requestKey;

    @Column(nullable = false, length = 64, updatable = false)
    private String originalDigest;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    private Instant deletedAt;

    @Column(nullable = false)
    private int commentCount;

    @Column(nullable = false)
    private boolean reported;

    private CommunityEntry(Long parentId, String ownerHash, UUID requestId, Instant now) {
        this.parentId = parentId;
        this.ownerHash = Objects.requireNonNull(ownerHash);
        this.requestKey = Objects.requireNonNull(requestId).toString();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static CommunityEntry post(String owner, UUID requestId, String title, String body, Instant now) {
        return post(owner, requestId, new PostContent(title, body, CommunityTopic.FREE), now);
    }

    public static CommunityEntry post(String owner, UUID requestId, PostContent content, Instant now) {
        CommunityEntry entry = new CommunityEntry(null, owner, requestId, now);
        entry.write(content.title(), content.body());
        entry.topic = content.topic();
        entry.originalDigest = entry.digest(content.title(), content.body(), entry.topic);
        return entry;
    }

    public static CommunityEntry comment(long parentId, String owner, UUID requestId, String body, Instant now) {
        CommunityEntry entry = new CommunityEntry(parentId, owner, requestId, now);
        entry.write(null, body);
        entry.originalDigest = entry.digest(null, body, null);
        return entry;
    }

    public CommunityTopic getTopic() {
        if (parentId != null) {
            return null;
        }
        return topic;
    }

    public void replyTo(CommunityEntry target) {
        target.requireCommentOf(parentId);
        if (target.replyToId != null) {
            throw notFound();
        }
        replyToId = target.id;
    }

    public void requireReplyTarget(Long expected) {
        if (!Objects.equals(replyToId, expected)) {
            throw new BusinessException(CommunityErrorCode.REQUEST_CONFLICT, "이미 다른 댓글에 사용한 요청 번호예요.");
        }
    }

    public CommunityEntry authoredBy(Long member, CommunityAuthorMode mode) {
        this.memberId = member;
        this.authorMode = Objects.requireNonNull(mode);
        return this;
    }

    public void requireMode(CommunityAuthorMode mode) {
        if (authorMode != mode) {
            throw new BusinessException(CommunityErrorCode.REQUEST_CONFLICT, "이미 다른 작성 방식에 사용한 요청 번호예요.");
        }
    }

    public void edit(String owner, String title, String body, Instant now) {
        requireOwner(owner);
        requireVisible();
        write(title, body);
        updatedAt = now;
    }

    public void editPost(String owner, String title, String body, CommunityTopic selected, Instant now) {
        edit(owner, title, body, now);
        topic = Objects.requireNonNullElse(selected, topic);
    }

    public void delete(String owner, Instant now) {
        requireOwner(owner);
        requireVisible();
        deletedAt = now;
    }

    public void requireVisible() {
        if (deletedAt != null) {
            throw notFound();
        }
    }

    public void requirePost() {
        requireVisible();
        if (parentId != null) {
            throw notFound();
        }
    }

    public void requireCommentOf(long postId) {
        requireVisible();
        if (!Objects.equals(parentId, postId)) {
            throw notFound();
        }
    }

    public void verifyRetry(String owner, Long parent, String title, String body) {
        verifyRetry(owner, parent, title, body, CommunityTopic.FREE);
    }

    public void verifyRetry(String owner, Long parent, String title, String body, CommunityTopic requestedTopic) {
        String requestedDigest = digest(title, body, requestedTopic);
        if (!isOwnedBy(owner) || !Objects.equals(parentId, parent) || !originalDigest.equals(requestedDigest)) {
            throw new BusinessException(CommunityErrorCode.REQUEST_CONFLICT, "이미 사용한 요청 번호예요. 내용을 확인해 주세요.");
        }
        requireVisible();
    }

    public boolean isOwnedBy(String owner) {
        return ownerHash.equals(owner);
    }

    public void addComment() {
        requirePost();
        commentCount++;
    }

    public void removeComment() {
        requirePost();
        if (commentCount < 1) {
            throw new IllegalStateException("댓글 수가 일치하지 않습니다.");
        }
        commentCount--;
    }

    public boolean recordFirstReport() {
        requireVisible();
        if (reported) {
            return false;
        }
        reported = true;
        return true;
    }

    private void requireOwner(String owner) {
        if (!isOwnedBy(owner)) {
            throw new BusinessException(CommunityErrorCode.NOT_OWNER, "작성자만 수정·삭제할 수 있어요.");
        }
    }

    private void write(String title, String body) {
        String normalizedTitle = normalizeTitle(title);
        String normalizedBody = CommunityText.required(body, bodyLimit());
        this.title = normalizedTitle;
        this.body = normalizedBody;
    }

    private String normalizeTitle(String title) {
        if (parentId != null) {
            return null;
        }
        return CommunityText.required(title, 100);
    }

    private int bodyLimit() {
        if (parentId != null) {
            return 1000;
        }
        return 5000;
    }

    private String digest(String title, String body, CommunityTopic selected) {
        String normalizedTitle = Objects.toString(normalizeTitle(title), "");
        String normalizedBody = CommunityText.required(body, bodyLimit());
        String content = normalizedTitle.length() + ":" + normalizedTitle + normalizedBody;
        if (selected == null || selected == CommunityTopic.FREE) {
            return CommunityDigest.hash(content);
        }
        return CommunityDigest.hash(selected.name() + ":" + content);
    }

    private BusinessException notFound() {
        return new BusinessException(CommunityErrorCode.NOT_FOUND, "글이나 댓글을 찾을 수 없어요.");
    }
}
