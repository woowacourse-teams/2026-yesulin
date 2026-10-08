package art.yesulin.show.domain;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.show.domain.performance.PerformanceVenue;
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
    void requiresOwner() {
        assertThrows(IllegalArgumentException.class, () -> new Show(
                0L, "햄릿", ShowGenre.PLAY, null, venue(), 120, null, "02-123-4567", 1L, List.of()
        ));
    }

    @Test
    void requiresGenre() {
        assertThrows(IllegalArgumentException.class, () -> new Show(
                1L, "햄릿", null, null, venue(), 120, null, "02-123-4567", 1L, List.of()
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
                1L, "햄릿", ShowGenre.PLAY, null, venue(), 120, null, "0212345678", 1L, List.of()
        ));

        assertEquals(ShowErrorCode.INVALID_INPUT, exception.getErrorCode());
    }

    @Test
    void startsWithoutAudienceGuideAndShowsRemainingSeats() {
        Show show = show(List.of());

        assertTrue(show.getLinks().isEmpty());
        assertTrue(show.getGuides().isEmpty());
        assertEquals("", show.getHostName());
        assertEquals("달빛 극단", show.hostNameOr("달빛 극단"));
        assertTrue(show.isRemainingSeatsVisible());
    }

    @Test
    void updatesAudienceGuideWithTrimmedValues() {
        Show show = show(List.of());

        show.updateAudienceGuide(" 2026 청년 연극 프로젝트 ",
                List.of(new ShowLink(" 인스타그램 ", "https://www.instagram.com/yesulin?hl=ko")),
                List.of(new ShowGuide(" 오시는 길 ", "  건물 오른쪽 골목의 전용 입구를 이용해 주세요.\n")), false);

        assertEquals("2026 청년 연극 프로젝트", show.getHostName());
        assertEquals("2026 청년 연극 프로젝트", show.hostNameOr("달빛 극단"));
        assertEquals("인스타그램", show.getLinks().getFirst().getLabel());
        assertEquals("https://www.instagram.com/yesulin?hl=ko", show.getLinks().getFirst().getUrl());
        assertEquals("오시는 길", show.getGuides().getFirst().getTitle());
        assertEquals("건물 오른쪽 골목의 전용 입구를 이용해 주세요.", show.getGuides().getFirst().getContent());
        assertFalse(show.isRemainingSeatsVisible());
    }

    @Test
    void rejectsTooManyLinksOrGuidesAndTooLongHostName() {
        Show show = show(List.of());
        List<ShowLink> fourLinks = List.of(
                new ShowLink("1", "https://a.example"), new ShowLink("2", "https://b.example"),
                new ShowLink("3", "https://c.example"), new ShowLink("4", "https://d.example")
        );
        List<ShowGuide> sixGuides = List.of(
                new ShowGuide("1", "내용"), new ShowGuide("2", "내용"), new ShowGuide("3", "내용"),
                new ShowGuide("4", "내용"), new ShowGuide("5", "내용"), new ShowGuide("6", "내용")
        );

        assertEquals(ShowErrorCode.INVALID_INPUT, assertThrows(BusinessException.class,
                () -> show.updateAudienceGuide("", fourLinks, List.of(), true)).getErrorCode());
        assertEquals(ShowErrorCode.INVALID_INPUT, assertThrows(BusinessException.class,
                () -> show.updateAudienceGuide("", List.of(), sixGuides, true)).getErrorCode());
        assertEquals(ShowErrorCode.INVALID_INPUT, assertThrows(BusinessException.class,
                () -> show.updateAudienceGuide("가".repeat(51), List.of(), List.of(), true)).getErrorCode());
    }

    @Test
    void requiresGuideTitleAndContentWithinLimits() {
        assertThrows(IllegalArgumentException.class, () -> new ShowGuide(" ", "내용"));
        assertThrows(IllegalArgumentException.class, () -> new ShowGuide("주차 안내", ""));
        assertEquals(ShowErrorCode.INVALID_INPUT, assertThrows(BusinessException.class,
                () -> new ShowGuide("가".repeat(31), "내용")).getErrorCode());
        assertEquals(ShowErrorCode.INVALID_INPUT, assertThrows(BusinessException.class,
                () -> new ShowGuide("주차 안내", "가".repeat(1001))).getErrorCode());
    }

    @Test
    void acceptsOnlyWebAddressesWithLabel() {
        assertDoesNotThrow(() -> new ShowLink("홈페이지", "HTTP://yesulin.art"));
        assertThrows(IllegalArgumentException.class, () -> new ShowLink(" ", "https://yesulin.art"));
        for (String url : List.of("yesulin.art", "ftp://yesulin.art", "https://instagram", "javascript:alert(1)",
                "https://yesulin .art", "https://" + "a".repeat(495) + ".art")) {
            assertEquals(ShowErrorCode.INVALID_INPUT,
                    assertThrows(BusinessException.class, () -> new ShowLink("링크", url)).getErrorCode(), url);
        }
        assertEquals(ShowErrorCode.INVALID_INPUT, assertThrows(BusinessException.class,
                () -> new ShowLink("가".repeat(31), "https://yesulin.art")).getErrorCode());
    }

    @Test
    void sendsAudienceToExternalReservationPageWhenUrlIsSet() {
        Show show = show(List.of());

        assertFalse(show.usesExternalReservation());
        assertDoesNotThrow(show::ensureReservableHere);

        show.updateExternalReservationUrl(" https://form.naver.com/response/abc123 ");

        assertTrue(show.usesExternalReservation());
        assertEquals("https://form.naver.com/response/abc123", show.getExternalReservationUrl());
        assertEquals(ShowErrorCode.EXTERNAL_RESERVATION,
                assertThrows(BusinessException.class, show::ensureReservableHere).getErrorCode());
    }

    @Test
    void requiresWebAddressAsExternalReservationUrl() {
        Show show = show(List.of());

        assertThrows(IllegalArgumentException.class, () -> show.updateExternalReservationUrl("  "));
        for (String url : List.of("form.naver.com/abc", "javascript:alert(1)", "https://naver",
                "https://" + "a".repeat(495) + ".com")) {
            assertEquals(ShowErrorCode.INVALID_INPUT, assertThrows(BusinessException.class,
                    () -> show.updateExternalReservationUrl(url)).getErrorCode(), url);
        }
        assertFalse(show.usesExternalReservation());
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
        return new Show(1L, "햄릿", ShowGenre.PLAY, null, venue(), 120, "8세 이상", "02-123-4567", 1L, imageFileIds);
    }

    private PerformanceVenue venue() {
        return new PerformanceVenue("예술인 소극장", "서울특별시 종로구 대학로 12", "", "", null, null);
    }
}
