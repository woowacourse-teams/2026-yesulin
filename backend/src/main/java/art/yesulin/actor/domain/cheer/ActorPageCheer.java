package art.yesulin.actor.domain.cheer;

import static art.yesulin.actor.domain.cheer.ActorCheerErrorCode.ACTOR_CHEER_NOT_AUTHOR;
import static art.yesulin.actor.domain.cheer.ActorCheerErrorCode.ACTOR_CHEER_NOT_FOUND;
import static art.yesulin.actor.domain.cheer.ActorCheerErrorCode.ACTOR_PAGE_SELF_CHEER;
import static art.yesulin.global.validation.DomainValidator.requireNonNull;
import static art.yesulin.global.validation.DomainValidator.requirePositive;

import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 팬이 배우 페이지에 남긴 응원 글. 배우 본인은 자기 페이지에 쓰지 않고, 작성자는 응답에 드러내지 않는다.
 */
@Entity
@Table(name = "actor_page_cheers")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ActorPageCheer {

    public static final int MAX_BODY_LENGTH = 500;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_page_id", nullable = false, updatable = false)
    private long actorPageId;

    @Column(name = "author_member_id", nullable = false, updatable = false)
    private long authorMemberId;

    @Column(name = "body", nullable = false, length = MAX_BODY_LENGTH)
    private String body;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    private ActorPageCheer(long actorPageId, long authorMemberId, String body, Instant now) {
        this.actorPageId = requirePositive(actorPageId, "배우 페이지 ID는 1 이상이어야 합니다.");
        this.authorMemberId = requirePositive(authorMemberId, "회원 ID는 1 이상이어야 합니다.");
        this.body = normalize(body);
        this.createdAt = requireNonNull(now, "작성 시각은 필수입니다.");
        this.updatedAt = now;
    }

    public static ActorPageCheer write(ActorPage page, long memberId, String body, Instant now) {
        if (page.getOwnerMemberId() == memberId) {
            throw new BusinessException(ACTOR_PAGE_SELF_CHEER, "내 배우 페이지에는 응원 글을 쓸 수 없어요.");
        }
        return new ActorPageCheer(requireNonNull(page.getId(), "저장된 배우 페이지가 필요합니다."), memberId, body, now);
    }

    public void edit(long memberId, String body, Instant now) {
        requireAuthor(memberId);
        this.body = normalize(body);
        this.updatedAt = requireNonNull(now, "수정 시각은 필수입니다.");
    }

    public void delete(long memberId, Instant now) {
        requireAuthor(memberId);
        this.deletedAt = requireNonNull(now, "삭제 시각은 필수입니다.");
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public boolean isEdited() {
        return updatedAt.isAfter(createdAt);
    }

    public boolean isWrittenBy(long memberId) {
        return authorMemberId == memberId;
    }

    private void requireAuthor(long memberId) {
        if (isDeleted()) {
            throw notFound();
        }
        if (!isWrittenBy(memberId)) {
            throw new BusinessException(ACTOR_CHEER_NOT_AUTHOR, "작성자만 수정·삭제할 수 있어요.");
        }
    }

    private static BusinessException notFound() {
        return new BusinessException(ACTOR_CHEER_NOT_FOUND, "응원 글을 찾을 수 없어요.");
    }

    private static String normalize(String body) {
        if (body == null || body.isBlank()) {
            throw new IllegalArgumentException("응원 글 내용을 입력해 주세요.");
        }
        String normalized = body.replace("\r\n", "\n").replace('\r', '\n').strip();
        if (normalized.length() > MAX_BODY_LENGTH) {
            throw new IllegalArgumentException("응원 글은 최대 %d자까지 쓸 수 있어요.".formatted(MAX_BODY_LENGTH));
        }
        return normalized;
    }
}
