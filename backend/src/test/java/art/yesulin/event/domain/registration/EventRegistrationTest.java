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
    void actorWithBusinessCardKeepsCardInformation() {
        EventRegistration registration = new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.ACTOR, " 김하늘 ", "01012345678", true, " haneul@test.com ", " @haneul ",
                BIRTH_DATE, "남극장", Set.of(EventActivityField.YOUTUBE, EventActivityField.THEATER), "무시",
                false, CAREERS
        ), "photo-key", TODAY, NOW);

        assertEquals("김하늘", registration.getName());
        assertEquals("010-1234-5678", registration.getPhone());
        assertTrue(registration.isBusinessCardRequested());
        assertEquals("haneul@test.com", registration.getEmail());
        assertEquals("@haneul", registration.getSnsHandle());
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
    void actorWithoutBusinessCardKeepsOnlyNameAndPhone() {
        EventRegistration registration = new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.ACTOR, "김하늘", "010-1234-5678", false, "haneul@test.com", "@haneul",
                BIRTH_DATE, null, THEATER, null, false, CAREERS
        ), "photo-key", TODAY, NOW);

        assertFalse(registration.isBusinessCardRequested());
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
                BIRTH_DATE, " 남극장 · 캐스팅 담당 ", THEATER, null, false, CAREERS
        ), "photo-key", TODAY, NOW);

        assertEquals("남극장 · 캐스팅 담당", registration.getAffiliation());
        assertFalse(registration.isBusinessCardRequested());
        assertNull(registration.getEmail());
        assertNull(registration.getSnsHandle());
        assertNull(registration.getBirthDate());
        assertNull(registration.getPhotoKey());
    }

    @Test
    void producerNeedsAffiliation() {
        assertThrows(BusinessException.class, () -> new EventRegistration(1L,
                EventRegistrationForm.withoutBusinessCard(EventParticipantType.PRODUCER, "이도현", "010-2345-6789", " "),
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

    private static EventRegistration cardWith(LocalDate birthDate, String photoKey, String email) {
        return new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.ACTOR, "김하늘", "010-1234-5678", true, email, null, birthDate, null,
                THEATER, null, true, List.of()
        ), photoKey, TODAY, NOW);
    }
}
