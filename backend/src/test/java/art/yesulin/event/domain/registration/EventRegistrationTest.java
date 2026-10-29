package art.yesulin.event.domain.registration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.global.exception.BusinessException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class EventRegistrationTest {

    private static final Instant NOW = Instant.parse("2026-10-26T01:00:00Z");
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final LocalDate BIRTH_DATE = LocalDate.of(2001, 3, 14);
    private static final Set<EventActivityField> THEATER = Set.of(EventActivityField.THEATER);
    private static final List<EventRegistrationCareer> CAREERS = List.of(
            new EventRegistrationCareer("2025-09", " 연극 <달빛 정거장> ", " 민수 역 ")
    );

    @Test
    void businessCardKeyIsRandomAndSurvivesConnectingAndDisconnecting() {
        EventRegistration first = cardWith(BIRTH_DATE, "photo-key", "first@example.test");
        EventRegistration second = cardWith(BIRTH_DATE, "photo-key", "second@example.test");
        String key = first.getBusinessCardKey();
        assertEquals(4, UUID.fromString(key).version());
        assertFalse(key.equals(second.getBusinessCardKey()));
        assertNull(first.getBusinessCardProfileUrl());
        first.connectBusinessCard(" https://example.test/actors/first ", 10L);
        assertEquals("https://example.test/actors/first", first.getBusinessCardProfileUrl());
        assertEquals(10L, first.getBusinessCardMemberId());
        first.connectBusinessCard(null, null);
        assertEquals(key, first.getBusinessCardKey());
        assertNull(first.getBusinessCardProfileUrl());
        assertNull(first.getBusinessCardMemberId());
    }

    @Test
    void businessCardDestinationMustBePublicHttpsAndCannotPointBackToQr() {
        EventRegistration registration = cardWith(BIRTH_DATE, "photo-key", "actor@example.test");
        for (String url : List.of("javascript:alert(1)", "http://example.test", "//example.test",
                "https://user:password@example.test/a", "https://example.test/n/another-card",
                "https://example.test/events/cards/another-card", "https://example.test/%65vents/cards/another-card",
                "https://example.test/%6e/another-card", "https://example.test/x/../n/another-card",
                "https://example.test/x/%2e%2e/events/cards/another-card", "https://example.test/../n/another-card",
                "https://example.test/a\r\nLocation:x")) {
            assertThrows(BusinessException.class, () -> registration.connectBusinessCard(url, null));
        }
    }

    @Test
    void actorWithBusinessCardKeepsCardInformation() {
        EventRegistration registration = new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.ACTOR, " 김하늘 ", "01012345678", true, " haneul@test.com ", " @haneul ",
                BIRTH_DATE, "남극장", Set.of(EventActivityField.YOUTUBE, EventActivityField.THEATER), "무시",
                false, CAREERS, null, EventSnsPlatform.INSTAGRAM
        ), "photo-key", TODAY, NOW);

        assertEquals("김하늘", registration.getName());
        assertEquals("010-1234-5678", registration.getPhone());
        assertTrue(registration.isBusinessCardRequested());
        assertEquals("haneul@test.com", registration.getEmail());
        assertEquals("@haneul", registration.getSnsHandle());
        assertEquals(EventSnsPlatform.INSTAGRAM, registration.getSnsPlatform());
        assertEquals(BIRTH_DATE, registration.getBirthDate());
        assertEquals("photo-key", registration.getPhotoKey());
        assertNull(registration.getAffiliation());
        assertEquals(List.of(EventActivityField.THEATER, EventActivityField.YOUTUBE),
                List.copyOf(registration.getActivityFields()));
        assertNull(registration.getOtherActivity());
        EventRegistrationCareer career = registration.getCareers().getFirst();
        assertEquals("2025-09", career.getPerformedMonth());
        assertEquals("연극 <달빛 정거장>", career.getWorkTitle());
        assertEquals("민수 역", career.getRole());
    }

    @Test
    void businessCardKeepsOptionalIntroUpToLimit() {
        EventRegistration registration = new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.ACTOR, "김하늘", "010-1234-5678", true, "haneul@test.com", null, BIRTH_DATE, null,
                THEATER, null, true, List.of(), " 무대 위에서 가장 솔직한 배우 "
        ), "photo-key", TODAY, NOW);

        assertEquals("무대 위에서 가장 솔직한 배우", registration.getIntro());
        assertNull(cardWith(BIRTH_DATE, "photo-key", "haneul@test.com").getIntro());
        assertThrows(BusinessException.class, () -> new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.ACTOR, "김하늘", "010-1234-5678", true, "haneul@test.com", null, BIRTH_DATE, null,
                THEATER, null, true, List.of(), "가".repeat(41)
        ), "photo-key", TODAY, NOW));
    }

    @Test
    void actorWithoutBusinessCardKeepsOnlyNameAndPhone() {
        EventRegistration registration = new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.ACTOR, "김하늘", "010-1234-5678", false, "haneul@test.com", "@haneul",
                BIRTH_DATE, null, THEATER, null, false, CAREERS
        ), "photo-key", TODAY, NOW);

        assertFalse(registration.isBusinessCardRequested());
        assertNull(registration.getBusinessCardKey());
        assertThrows(BusinessException.class, () -> registration.connectBusinessCard("https://example.test/a", null));
        assertNull(registration.getEmail());
        assertNull(registration.getSnsHandle());
        assertNull(registration.getBirthDate());
        assertNull(registration.getPhotoKey());
        assertTrue(registration.getActivityFields().isEmpty());
        assertTrue(registration.getCareers().isEmpty());
    }

    @Test
    void newcomerHasNoCareersAndOtherFieldNeedsName() {
        EventRegistration registration = card(Set.of(EventActivityField.OTHER), " 성우 ", true, List.of());

        assertTrue(registration.isNoCareer());
        assertTrue(registration.getCareers().isEmpty());
        assertEquals("성우", registration.getOtherActivity());
        assertThrows(BusinessException.class, () -> card(Set.of(EventActivityField.OTHER), " ", false, CAREERS));
    }

    @Test
    void businessCardNeedsPhotoBirthDateEmailFieldAndCareers() {
        assertThrows(BusinessException.class, () -> cardWith(BIRTH_DATE, null, "haneul@test.com"));
        assertThrows(BusinessException.class, () -> cardWith(BIRTH_DATE, " ", "haneul@test.com"));
        assertThrows(BusinessException.class, () -> cardWith(null, "photo-key", "haneul@test.com"));
        assertThrows(BusinessException.class, () -> cardWith(TODAY.plusDays(1), "photo-key", "haneul@test.com"));
        assertThrows(BusinessException.class, () -> cardWith(BIRTH_DATE, "photo-key", null));
        assertThrows(BusinessException.class, () -> card(Set.of(), null, false, CAREERS));
        assertThrows(BusinessException.class, () -> card(THEATER, null, false, List.of()));
        assertThrows(BusinessException.class, () -> card(THEATER, null, true, CAREERS));
        assertThrows(BusinessException.class, () -> new EventRegistrationCareer("2025-13", "작품", null));
        assertThrows(BusinessException.class, () -> new EventRegistrationCareer("2025-09", " ", null));
    }

    @Test
    void producerKeepsAffiliationOnly() {
        EventRegistration registration = new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.PRODUCER, "이도현", "010-2345-6789", true, "dohyun@test.com", "@dohyun",
                BIRTH_DATE, " 남극장 ", THEATER, null, false, CAREERS, null, null, " 캐스팅과 제작 담당 "
        ), "photo-key", TODAY, NOW);

        assertEquals("남극장", registration.getAffiliation());
        assertEquals("캐스팅과 제작 담당", registration.getCurrentWork());
        assertFalse(registration.isBusinessCardRequested());
        assertNull(registration.getEmail());
        assertNull(registration.getSnsHandle());
        assertNull(registration.getBirthDate());
        assertNull(registration.getPhotoKey());
    }

    @Test
    void producerNeedsAffiliationAndCurrentWork() {
        assertThrows(BusinessException.class, () -> new EventRegistration(1L, EventRegistrationForm.withoutBusinessCard(
                EventParticipantType.PRODUCER, "이도현", "010-2345-6789", " ", "캐스팅 담당"), null, TODAY, NOW));
        assertThrows(BusinessException.class, () -> new EventRegistration(1L, EventRegistrationForm.withoutBusinessCard(
                EventParticipantType.PRODUCER, "이도현", "010-2345-6789", "남극장", " "), null, TODAY, NOW));
        assertThrows(BusinessException.class, () -> new EventRegistration(1L, EventRegistrationForm.withoutBusinessCard(
                EventParticipantType.PRODUCER, "이도현", "010-2345-6789", "가".repeat(101), "캐스팅 담당"),
                null, TODAY, NOW));
    }

    @Test
    void rejectsMissingTypeAndMalformedContacts() {
        assertThrows(BusinessException.class, () -> new EventRegistration(1L,
                EventRegistrationForm.withoutBusinessCard(null, "김하늘", "010-1234-5678", null), null, TODAY, NOW));
        assertThrows(BusinessException.class, () -> new EventRegistration(1L,
                EventRegistrationForm.withoutBusinessCard(EventParticipantType.ACTOR, "김하늘", "02-123-4567", null),
                null, TODAY, NOW));
        assertThrows(BusinessException.class, () -> cardWith(BIRTH_DATE, "photo-key", "haneul"));
        assertThrows(BusinessException.class, () -> cardWith(BIRTH_DATE, "photo-key", "haneul@test"));
        assertThrows(BusinessException.class, () -> cardWith(BIRTH_DATE, "photo-key", "haneul@test..com"));
        assertThrows(BusinessException.class, () -> cardWith(BIRTH_DATE, "photo-key", "!@!." + "!.".repeat(120)));
        assertEquals("haneul@mail.test.co.kr", cardWith(BIRTH_DATE, "photo-key", "haneul@mail.test.co.kr").getEmail());
    }

    private static EventRegistration card(
            Set<EventActivityField> fields,
            String otherActivity,
            boolean noCareer,
            List<EventRegistrationCareer> careers
    ) {
        return new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.ACTOR, "김하늘", "010-1234-5678", true, "haneul@test.com", null, BIRTH_DATE,
                null, fields, otherActivity, noCareer, careers
        ), "photo-key", TODAY, NOW);
    }

    @Test
    void snsRequiresTypeAndShortNameAndRejectsLinks() {
        for (EventSnsPlatform platform : EventSnsPlatform.values()) {
            assertEquals(platform, sns(platform, " 예술배우 ").getSnsPlatform());
            assertEquals("예술배우", sns(platform, " 예술배우 ").getSnsHandle());
        }
        assertNull(sns(null, " ").getSnsPlatform());
        assertThrows(BusinessException.class, () -> sns(null, "예술배우"));
        assertThrows(BusinessException.class, () -> sns(EventSnsPlatform.THREADS, " "));
        assertThrows(BusinessException.class, () -> sns(EventSnsPlatform.INSTAGRAM, "가".repeat(21)));
        assertThrows(BusinessException.class, () -> sns(EventSnsPlatform.YOUTUBE, "https://a"));
        assertThrows(BusinessException.class, () -> sns(EventSnsPlatform.YOUTUBE, "youtu.be"));
        assertEquals("가".repeat(20), sns(EventSnsPlatform.YOUTUBE, "가".repeat(20)).getSnsHandle());
    }

    private static EventRegistration sns(EventSnsPlatform platform, String handle) {
        return new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.ACTOR, "김예술", "010-1234-5678", true, "actor@example.test", handle,
                BIRTH_DATE, null, THEATER, null, true, List.of(), null, platform
        ), "photo-key", TODAY, NOW);
    }

    private static EventRegistration cardWith(LocalDate birthDate, String photoKey, String email) {
        return new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.ACTOR, "김하늘", "010-1234-5678", true, email, null, birthDate, null,
                THEATER, null, true, List.of()
        ), photoKey, TODAY, NOW);
    }
    @Test
    void paymentConfirmationUsesMicrosecondsAndKeepsTheTimeWhenRepeated() {
        EventRegistration registration = new EventRegistration(1L, EventRegistrationForm.withoutBusinessCard(
                EventParticipantType.ACTOR, "일반 참가자", "010-1234-5678", null), null, TODAY, NOW);
        Instant preciseNow = Instant.parse("2026-10-28T09:07:07.115123456Z");
        Instant storedTime = Instant.parse("2026-10-28T09:07:07.115123Z");

        assertTrue(registration.changePaymentStatus(EventPaymentStatus.CONFIRMED, preciseNow));
        assertEquals(storedTime, registration.getPaymentConfirmedAt());
        assertFalse(registration.changePaymentStatus(EventPaymentStatus.CONFIRMED, preciseNow.plusSeconds(60)));
        assertEquals(storedTime, registration.getPaymentConfirmedAt());
        assertTrue(registration.changePaymentStatus(EventPaymentStatus.PENDING, preciseNow.plusSeconds(120)));
        assertNull(registration.getPaymentConfirmedAt());
    }

}
