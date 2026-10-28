package art.yesulin.actor.domain.bookmark;

import static java.util.Objects.requireNonNull;

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

/**
 * 공연사가 관심 배우로 저장한 배우 페이지. 아이디는 바뀔 수 있으므로 페이지 ID를 참조한다. 저장한 배우가 비공개가 되어도
 * 저장은 지우지 않고 목록에서만 숨긴다.
 */
@Entity
@Table(name = "producer_actor_bookmarks", uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_producer_actor_bookmarks_page", columnNames = {"producer_member_id", "actor_page_id"}
        )
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProducerActorBookmark {

    /** 숨겨진 저장도 포함한 공연사당 최대 저장 수. */
    public static final int MAX_PER_PRODUCER = 300;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "producer_member_id", nullable = false, updatable = false)
    private long producerMemberId;

    @Column(name = "actor_page_id", nullable = false, updatable = false)
    private long actorPageId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public ProducerActorBookmark(long producerMemberId, long actorPageId, Instant createdAt) {
        this.producerMemberId = producerMemberId;
        this.actorPageId = actorPageId;
        this.createdAt = requireNonNull(createdAt, "저장 시각은 필수입니다.");
    }
}
