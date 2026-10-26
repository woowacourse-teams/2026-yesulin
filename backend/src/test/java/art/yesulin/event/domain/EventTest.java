package art.yesulin.event.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.global.exception.BusinessException;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class EventTest {

    private static final Instant NOW = Instant.parse("2026-10-21T01:00:00Z");
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 21);
    private static final EventImages BANNER_IMAGES = new EventImages(null, "desktop-key", "mobile-key");

    @Test
    void trimsTextKeepsBodyLinesAndClearsBlankOptionalFields() {
        Event event = new Event(new EventContent(
                "  1기 서포터즈 모집 ", " ", "첫 줄\r\n\r\n셋째 줄  ", null, null, " ", "신청하기"
        ), null, null, 1L, NOW);

        assertEquals("1기 서포터즈 모집", event.getTitle());
        assertNull(event.getSummary());
        assertEquals("첫 줄\n\n셋째 줄", event.getBody());
        assertNull(event.getApplyUrl());
        assertNull(event.getApplyLabel());
        assertFalse(event.isBannerEnabled());
        assertEquals(EventStatus.PENDING, event.getStatus());
    }

    @Test
    void rejectsMissingTitleOrBodyAndReversedPeriod() {
        assertThrows(BusinessException.class, () -> event(content(" ", "본문", null, null)));
        assertThrows(BusinessException.class, () -> event(content("제목", " ", null, null)));
        assertThrows(BusinessException.class, () -> event(content(
                "제목", "본문", LocalDate.of(2026, 10, 16), LocalDate.of(2026, 10, 1)
        )));
    }

    @Test
    void rejectsApplyLinkThatIsNotWebAddress() {
        EventContent content = new EventContent("제목", null, "본문", null, null, "javascript:alert(1)", null);

        assertThrows(BusinessException.class, () -> event(content));
    }

    @Test
    void bannerNeedsBothImagesAndAlt() {
        EventBannerSetting banner = new EventBannerSetting(true, "서포터즈 모집", null, 0);

        assertThrows(BusinessException.class, () -> new Event(content("제목", "본문", null, null), banner,
                new EventImages(null, "desktop-key", null), 1L, NOW));
        assertThrows(BusinessException.class, () -> new Event(content("제목", "본문", null, null),
                new EventBannerSetting(true, " ", null, 0), BANNER_IMAGES, 1L, NOW));
        assertThrows(BusinessException.class, () -> new Event(content("제목", "본문", null, null),
                new EventBannerSetting(true, "문구", null, 100), BANNER_IMAGES, 1L, NOW));
    }

    @Test
    void bannerIsCandidateOnlyWhilePublishedAndUntilItsEndDate() {
        Event event = new Event(content("제목", "본문", null, null),
                new EventBannerSetting(true, "서포터즈 모집", TODAY, 0), BANNER_IMAGES, 1L, NOW);

        assertFalse(event.isBannerCandidateOn(TODAY));

        event.changeStatus(EventStatus.PUBLISHED, NOW);
        assertTrue(event.isBannerCandidateOn(TODAY));
        assertFalse(event.isBannerCandidateOn(TODAY.plusDays(1)));

        event.changeStatus(EventStatus.HIDDEN, NOW);
        assertFalse(event.isBannerCandidateOn(TODAY));
    }

    @Test
    void phaseFollowsPeriodAndOpenPeriodIsAlwaysOngoing() {
        Event event = event(content("제목", "본문", TODAY, TODAY.plusDays(3)));

        assertEquals(EventPhase.UPCOMING, event.phaseOn(TODAY.minusDays(1)));
        assertEquals(EventPhase.ONGOING, event.phaseOn(TODAY.plusDays(3)));
        assertEquals(EventPhase.ENDED, event.phaseOn(TODAY.plusDays(4)));
        assertEquals(EventPhase.ONGOING, event(content("제목", "본문", null, null)).phaseOn(TODAY));
    }

    @Test
    void acceptsRegistrationsOnlyWhilePublishedEnabledAndNotEnded() {
        Event event = event(new EventContent(
                "월요살롱", null, "본문", null, TODAY, null, "참가 신청하기", true, " 보증금 5,000원\r\n현장 반환 "
        ));

        assertEquals("보증금 5,000원\n현장 반환", event.getRegistrationNotice());
        assertEquals("참가 신청하기", event.getApplyLabel());
        assertFalse(event.isAcceptingRegistrationsOn(TODAY));
        event.changeStatus(EventStatus.PUBLISHED, NOW);
        assertTrue(event.isAcceptingRegistrationsOn(TODAY));
        assertFalse(event.isAcceptingRegistrationsOn(TODAY.plusDays(1)));
    }

    @Test
    void turningRegistrationOffClearsNotice() {
        Event event = event(new EventContent("제목", null, "본문", null, null, null, "신청", false, "안내"));

        assertFalse(event.isRegistrationEnabled());
        assertNull(event.getRegistrationNotice());
        assertNull(event.getApplyLabel());
    }

    @Test
    void decidedEventCannotGoBackToPending() {
        Event event = event(content("제목", "본문", null, null));
        event.changeStatus(EventStatus.PUBLISHED, NOW);

        assertThrows(BusinessException.class, () -> event.changeStatus(EventStatus.PENDING, NOW));
    }

    private static Event event(EventContent content) {
        return new Event(content, EventBannerSetting.disabled(), EventImages.none(), 1L, NOW);
    }

    private static EventContent content(String title, String body, LocalDate startsOn, LocalDate endsOn) {
        return new EventContent(title, null, body, startsOn, endsOn, null, null);
    }
}
