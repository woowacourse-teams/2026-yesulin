package art.yesulin.community.domain;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
        CommunityEntry entry = new CommunityEntry(null, owner, requestId, now);
        entry.write(title, body);
        entry.originalDigest = entry.digest(title, body);
        return entry;
    }

    public static CommunityEntry comment(long parentId, String owner, UUID requestId, String body, Instant now) {
        CommunityEntry entry = new CommunityEntry(parentId, owner, requestId, now);
        entry.write(null, body);
        entry.originalDigest = entry.digest(null, body);
        return entry;
    }

    public void edit(String owner, String title, String body, Instant now) {
        requireOwner(owner);
        requireVisible();
        write(title, body);
        updatedAt = now;
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
        if (!isOwnedBy(owner) || !Objects.equals(parentId, parent) || !originalDigest.equals(digest(title, body))) {
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
            throw new BusinessException(CommunityErrorCode.NOT_OWNER, "작성한 브라우저에서만 수정·삭제할 수 있어요.");
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

    private String digest(String title, String body) {
        String normalizedTitle = Objects.toString(normalizeTitle(title), "");
        String normalizedBody = CommunityText.required(body, bodyLimit());
        return CommunityDigest.hash(normalizedTitle.length() + ":" + normalizedTitle + normalizedBody);
    }

    private BusinessException notFound() {
        return new BusinessException(CommunityErrorCode.NOT_FOUND, "글이나 댓글을 찾을 수 없어요.");
    }
}
