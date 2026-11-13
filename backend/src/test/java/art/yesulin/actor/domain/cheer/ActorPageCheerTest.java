package art.yesulin.actor.domain.cheer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.global.exception.BusinessException;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class ActorPageCheerTest {

    private static final Instant NOW = Instant.parse("2026-11-12T00:00:00Z");
    private static final long OWNER = 7L;
    private static final long FAN = 8L;

    @Test
    void writeNormalizesLineBreaksAndSpaces() {
        ActorPageCheer cheer = ActorPageCheer.write(page(), FAN, "  응원해요\r\n힘내세요\r  ", NOW);

        assertEquals("응원해요\n힘내세요", cheer.getBody());
        assertEquals(10L, cheer.getActorPageId());
        assertEquals(FAN, cheer.getAuthorMemberId());
        assertFalse(cheer.isEdited());
    }

    @Test
    void writeRejectsBlankAndTooLongBody() {
        assertThrows(IllegalArgumentException.class, () -> ActorPageCheer.write(page(), FAN, "   ", NOW));
        assertThrows(IllegalArgumentException.class, () -> ActorPageCheer.write(page(), FAN, null, NOW));
        assertThrows(IllegalArgumentException.class,
                () -> ActorPageCheer.write(page(), FAN, "가".repeat(ActorPageCheer.MAX_BODY_LENGTH + 1), NOW));
        ActorPageCheer.write(page(), FAN, "가".repeat(ActorPageCheer.MAX_BODY_LENGTH), NOW);
    }

    @Test
    void ownerCannotCheerOwnPage() {
        BusinessException exception = assertThrows(
                BusinessException.class, () -> ActorPageCheer.write(page(), OWNER, "응원", NOW)
        );

        assertEquals(ActorCheerErrorCode.ACTOR_PAGE_SELF_CHEER, exception.getErrorCode());
    }

    @Test
    void onlyAuthorCanEditAndDelete() {
        ActorPageCheer cheer = ActorPageCheer.write(page(), FAN, "응원", NOW);

        assertEquals(ActorCheerErrorCode.ACTOR_CHEER_NOT_AUTHOR, assertThrows(BusinessException.class,
                () -> cheer.edit(OWNER, "바꿈", NOW)).getErrorCode());
        assertEquals(ActorCheerErrorCode.ACTOR_CHEER_NOT_AUTHOR, assertThrows(BusinessException.class,
                () -> cheer.delete(99L, NOW)).getErrorCode());
        cheer.edit(FAN, " 바꾼 응원 ", NOW.plusSeconds(60));
        assertEquals("바꾼 응원", cheer.getBody());
        assertTrue(cheer.isEdited());
    }

    @Test
    void deletedCheerCannotBeEditedOrDeletedAgain() {
        ActorPageCheer cheer = ActorPageCheer.write(page(), FAN, "응원", NOW);

        cheer.delete(FAN, NOW.plusSeconds(1));

        assertTrue(cheer.isDeleted());
        assertEquals(ActorCheerErrorCode.ACTOR_CHEER_NOT_FOUND, assertThrows(BusinessException.class,
                () -> cheer.edit(FAN, "또", NOW)).getErrorCode());
        assertEquals(ActorCheerErrorCode.ACTOR_CHEER_NOT_FOUND, assertThrows(BusinessException.class,
                () -> cheer.delete(FAN, NOW)).getErrorCode());
    }

    @Test
    void fanNumbersFollowFirstCheerOrder() {
        ActorFanNumbers numbers = new ActorFanNumbers(List.of(30L, 10L, 20L));

        assertEquals(1, numbers.numberOf(30L));
        assertEquals(2, numbers.numberOf(10L));
        assertEquals(3, numbers.numberOf(20L));
        assertThrows(IllegalStateException.class, () -> numbers.numberOf(40L));
    }

    private static ActorPage page() {
        ActorPage page = new ActorPage(OWNER);
        ReflectionTestUtils.setField(page, "id", 10L);
        return page;
    }
}
