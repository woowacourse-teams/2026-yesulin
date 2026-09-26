package art.yesulin.domain.show;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.performance.PerformanceVenue;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class ShowTest {

    private static final Instant NOW = Instant.parse("2026-10-01T10:00:00Z");

    @Test
    void startsAsPrivateDraftWithOptionalTextNormalized() {
        Show show = show(List.of(10L, 11L));

        assertEquals(ShowStatus.DRAFT, show.getStatus());
        assertFalse(show.isPublic());
        assertEquals("", show.getDescription());
        assertEquals(List.of(10L, 11L), show.getImageFileIds());
    }

    @Test
    void requiresGenre() {
        assertThrows(IllegalArgumentException.class, () -> new Show(
                "햄릿", null, null, venue(), 120, null, "02-123-4567", 1L, List.of()
        ));
    }

    @Test
    void rejectsMoreThanThreeOrDuplicatedImages() {
        BusinessException tooMany = assertThrows(BusinessException.class, () -> show(List.of(1L, 2L, 3L, 4L)));
        BusinessException duplicated = assertThrows(BusinessException.class, () -> show(List.of(1L, 1L)));

        assertEquals(ShowErrorCode.INVALID_INPUT, tooMany.getErrorCode());
        assertEquals(ShowErrorCode.INVALID_INPUT, duplicated.getErrorCode());
    }

    @Test
    void rejectsInvalidInquiryPhone() {
        BusinessException exception = assertThrows(BusinessException.class, () -> new Show(
                "햄릿", ShowGenre.PLAY, null, venue(), 120, null, "0212345678", 1L, List.of()
        ));

        assertEquals(ShowErrorCode.INVALID_INPUT, exception.getErrorCode());
    }

    @Test
    void opensOnlyWhenOwnSessionIsStillBookable() {
        Show show = persistedShow(1L);
        ShowSession pastSession = new ShowSession(1L, NOW.minusSeconds(60), 30);
        ShowSession otherShowSession = new ShowSession(2L, NOW.plusSeconds(3600), 30);

        BusinessException exception = assertThrows(
                BusinessException.class, () -> show.open(NOW, List.of(pastSession, otherShowSession))
        );
        show.open(NOW, List.of(new ShowSession(1L, NOW.plusSeconds(3600), 30)));

        assertEquals(ShowErrorCode.NOT_OPENABLE, exception.getErrorCode());
        assertEquals(ShowStatus.OPEN, show.getStatus());
        assertTrue(show.isPublic());
    }

    @Test
    void keepsOpenStatusWhenOpenedAgain() {
        Show show = persistedShow(1L);
        show.open(NOW, List.of(new ShowSession(1L, NOW.plusSeconds(3600), 30)));

        assertDoesNotThrow(() -> show.open(NOW, List.of()));
        assertEquals(ShowStatus.OPEN, show.getStatus());
    }

    @Test
    void closesOnlyOpenShowAndReopensClosedShow() {
        Show show = persistedShow(1L);
        List<ShowSession> sessions = List.of(new ShowSession(1L, NOW.plusSeconds(3600), 30));

        BusinessException exception = assertThrows(BusinessException.class, show::close);
        show.open(NOW, sessions);
        show.close();

        assertEquals(ShowErrorCode.INVALID_STATUS, exception.getErrorCode());
        assertEquals(ShowStatus.CLOSED, show.getStatus());
        assertEquals(ShowErrorCode.NOT_OPEN,
                assertThrows(BusinessException.class, show::ensureOpen).getErrorCode());

        show.open(NOW, sessions);

        assertEquals(ShowStatus.OPEN, show.getStatus());
    }

    private Show persistedShow(long id) {
        Show show = show(List.of());
        ReflectionTestUtils.setField(show, "id", id);
        return show;
    }

    private Show show(List<Long> imageFileIds) {
        return new Show("햄릿", ShowGenre.PLAY, null, venue(), 120, "8세 이상", "02-123-4567", 1L, imageFileIds);
    }

    private PerformanceVenue venue() {
        return new PerformanceVenue("예술인 소극장", "서울특별시 종로구 대학로 12", "", "", null, null);
    }
}
