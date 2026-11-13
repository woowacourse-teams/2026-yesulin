package art.yesulin.actor.domain.cheer;

import static art.yesulin.actor.domain.cheer.ActorCheerErrorCode.ACTOR_PAGE_SELF_LIKE;
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
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "actor_page_likes", uniqueConstraints = {
        @UniqueConstraint(name = "uk_actor_page_likes_page_member", columnNames = {"actor_page_id", "member_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ActorPageLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_page_id", nullable = false, updatable = false)
    private long actorPageId;

    @Column(name = "member_id", nullable = false, updatable = false)
    private long memberId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    private ActorPageLike(long actorPageId, long memberId, Instant createdAt) {
        this.actorPageId = requirePositive(actorPageId, "배우 페이지 ID는 1 이상이어야 합니다.");
        this.memberId = requirePositive(memberId, "회원 ID는 1 이상이어야 합니다.");
        this.createdAt = requireNonNull(createdAt, "좋아요 시각은 필수입니다.");
    }

    /** 배우는 자기 페이지에 좋아요를 누를 수 없다. */
    public static ActorPageLike of(ActorPage page, long memberId, Instant createdAt) {
        if (page.getOwnerMemberId() == memberId) {
            throw new BusinessException(ACTOR_PAGE_SELF_LIKE, "내 배우 페이지에는 좋아요를 누를 수 없어요.");
        }
        return new ActorPageLike(requireNonNull(page.getId(), "저장된 배우 페이지가 필요합니다."), memberId, createdAt);
    }
}
