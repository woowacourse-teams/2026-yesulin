package art.yesulin.actor.domain.cheer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.global.exception.BusinessException;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class ActorPageLikeTest {

    private static final Instant NOW = Instant.parse("2026-11-12T00:00:00Z");

    @Test
    void likeKeepsPageMemberAndTime() {
        ActorPageLike like = ActorPageLike.of(savedPage(10L, 7L), 8L, NOW);

        assertEquals(10L, like.getActorPageId());
        assertEquals(8L, like.getMemberId());
        assertEquals(NOW, like.getCreatedAt());
    }

    @Test
    void ownerCannotLikeOwnPage() {
        BusinessException exception = assertThrows(
                BusinessException.class, () -> ActorPageLike.of(savedPage(10L, 7L), 7L, NOW)
        );

        assertEquals(ActorCheerErrorCode.ACTOR_PAGE_SELF_LIKE, exception.getErrorCode());
    }

    @Test
    void unsavedPageCannotBeLiked() {
        assertThrows(IllegalArgumentException.class, () -> ActorPageLike.of(new ActorPage(7L), 8L, NOW));
    }

    private static ActorPage savedPage(long id, long ownerMemberId) {
        ActorPage page = new ActorPage(ownerMemberId);
        ReflectionTestUtils.setField(page, "id", id);
        return page;
    }
}
