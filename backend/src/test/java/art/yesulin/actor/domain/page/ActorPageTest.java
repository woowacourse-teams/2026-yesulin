package art.yesulin.actor.domain.page;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.global.exception.BusinessException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ActorPageTest {

    private static final Instant NOW = Instant.parse("2026-10-27T00:00:00Z");
    private static final ActorPageReadiness READY = new ActorPageReadiness(true, List.of(), false, false);

    @Test
    void allowsHandleChangesUntilFirstPublicationAndPreservesCurrentHandleAfterwards() {
        ActorPage page = new ActorPage(1L);
        page.changeHandle(new ActorPageHandle("first"));
        page.changeHandle(new ActorPageHandle("second"));
        page.publish(true, ActorPage.CONSENT_VERSION, READY, NOW);
        page.unpublish();
        page.changeHandle(new ActorPageHandle(" SECOND "));
        BusinessException exception = assertThrows(BusinessException.class,
                () -> page.changeHandle(new ActorPageHandle("third")));
        assertEquals(ActorPageErrorCode.ACTOR_HANDLE_LOCKED, exception.getErrorCode());
        assertEquals("second", page.getHandle());
    }

    @Test
    void publicationChecksConsentThenLockThenReadiness() {
        ActorPage page = new ActorPage(1L);
        page.lock("관리 사유", 9L, NOW);
        ActorPageReadiness missing = new ActorPageReadiness(false, List.of(ActorPageMissingField.NAME), false, true);
        assertError(ActorPageErrorCode.ACTOR_PAGE_CONSENT_REQUIRED, () -> page.publish(false, "old", missing, NOW));
        assertError(ActorPageErrorCode.ACTOR_PAGE_CONSENT_REQUIRED,
                () -> page.publish(true, "old", missing, NOW));
        assertError(ActorPageErrorCode.ACTOR_PAGE_LOCKED,
                () -> page.publish(true, ActorPage.CONSENT_VERSION, missing, NOW));
        page.unlock(NOW);
        BusinessException exception = assertThrows(BusinessException.class,
                () -> page.publish(true, ActorPage.CONSENT_VERSION, missing, NOW));
        assertEquals(ActorPageErrorCode.ACTOR_PAGE_NOT_READY, exception.getErrorCode());
        assertTrue(exception.getMessage().contains("이름"));
    }

    @Test
    void publicationIsIdempotentAndRepublishingPreservesFirstPublicationTime() {
        ActorPage page = new ActorPage(1L);
        assertTrue(page.publish(true, ActorPage.CONSENT_VERSION, READY, NOW));
        assertFalse(page.publish(true, ActorPage.CONSENT_VERSION, READY, NOW.plusSeconds(10)));
        assertEquals(NOW, page.getPublishedAt());
        assertEquals(NOW, page.getLastPublicActivityAt());
        page.unpublish();
        page.unpublish();
        assertTrue(page.publish(true, ActorPage.CONSENT_VERSION, READY, NOW.plusSeconds(20)));
        assertEquals(NOW, page.getFirstPublishedAt());
        assertEquals(NOW.plusSeconds(20), page.getPublishedAt());
    }

    @Test
    void unlockingNeverRepublishesAndClearsLockMetadata() {
        ActorPage page = new ActorPage(1L);
        page.publish(true, ActorPage.CONSENT_VERSION, READY, NOW);
        page.lock("사유", 9L, NOW);
        assertEquals(ActorPageStatus.PRIVATE, page.getStatus());
        assertEquals(9L, page.getLockedBy());
        assertThrows(IllegalArgumentException.class, () -> page.lock("가".repeat(501), 9L, NOW));
        page.unlock(NOW.plusSeconds(10));
        assertEquals(ActorPageStatus.PRIVATE, page.getStatus());
        assertNull(page.getLockedAt());
        assertNull(page.getLockedBy());
        assertNull(page.getLockReason());
        assertEquals(NOW.plusSeconds(10), page.getUnlockedAt());
    }

    @Test
    void automaticHidingPrioritizesAgeAndRepublishingClearsTheReason() {
        ActorPage page = new ActorPage(1L);
        page.publish(true, ActorPage.CONSENT_VERSION, READY, NOW);
        page.synchronizeContent(
                new ActorPageReadiness(false, List.of(ActorPageMissingField.NAME), true, false), true, NOW
        );
        assertEquals(ActorPageAutoHiddenReason.UNDER_14, page.getAutoHiddenReason());
        assertEquals(ActorPageStatus.PRIVATE, page.getStatus());
        page.publish(true, ActorPage.CONSENT_VERSION, READY, NOW.plusSeconds(10));
        assertNull(page.getAutoHiddenReason());
        page.synchronizeContent(
                new ActorPageReadiness(false, List.of(ActorPageMissingField.PUBLIC_PHOTO), false, false), true, NOW
        );
        assertEquals(ActorPageAutoHiddenReason.MISSING_REQUIRED, page.getAutoHiddenReason());
        page.unpublish();
        assertNull(page.getAutoHiddenReason());
    }

    @Test
    void privateFieldDefaultsAndPartialChangesAreIndependent() {
        ActorPage page = new ActorPage(1L);
        for (ActorPageField field : ActorPageField.values()) {
            assertEquals(ActorPageVisibility.PRIVATE, page.visibilityOf(field));
        }
        page.changeVisibilities(Map.of(ActorPageField.EDUCATION, ActorPageVisibility.PUBLIC));
        assertEquals(ActorPageVisibility.PUBLIC, page.visibilityOf(ActorPageField.EDUCATION));
        assertEquals(ActorPageVisibility.PRIVATE, page.visibilityOf(ActorPageField.CAREERS));
    }

    @Test
    void promptIsRecordedOnceAndPrivateContentDoesNotAffectActivity() {
        ActorPage page = new ActorPage(1L);
        page.recordPublishPrompt(NOW);
        page.recordPublishPrompt(NOW.plusSeconds(10));
        assertEquals(NOW, page.getPublishPromptShownAt());
        page.synchronizeContent(READY, true, NOW);
        assertNull(page.getLastPublicActivityAt());
    }

    private void assertError(ActorPageErrorCode code, Runnable action) {
        assertEquals(code, assertThrows(BusinessException.class, action::run).getErrorCode());
    }
}
