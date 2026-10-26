package art.yesulin.event.domain.registration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

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
    private static final List<EventRegistrationCareer> CAREERS = List.of(
            new EventRegistrationCareer("2025-09", " 연극 <달빛 정거장> ", " 민수 역 ")
    );

    @Test
    void actorKeepsBirthDateAndPhotoButNotAffiliation() {
        EventRegistration registration = new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.ACTOR, " 김하늘 ", "01012345678", " haneul@test.com ", " @haneul ",
                BIRTH_DATE, "남극장", Set.of(EventActivityField.YOUTUBE, EventActivityField.THEATER), "무시",
                false, CAREERS
        ), "photo-key", TODAY, NOW);

        assertEquals("김하늘", registration.getName());
        assertEquals("010-1234-5678", registration.getPhone());
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
    void newcomerHasNoCareersAndOtherFieldNeedsName() {
        EventRegistration registration = new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.ACTOR, "김하늘", "010-1234-5678", "haneul@test.com", null, BIRTH_DATE, null,
                Set.of(EventActivityField.OTHER), " 성우 ", true, List.of()
        ), "photo-key", TODAY, NOW);

        assertEquals(true, registration.isNoCareer());
        assertEquals(0, registration.getCareers().size());
        assertEquals("성우", registration.getOtherActivity());
        assertThrows(BusinessException.class, () -> actorWith(Set.of(EventActivityField.OTHER), " ", false, CAREERS));
    }

    @Test
    void actorNeedsFieldAndEitherCareersOrNoCareer() {
        assertThrows(BusinessException.class, () -> actorWith(Set.of(), null, false, CAREERS));
        Set<EventActivityField> media = Set.of(EventActivityField.MEDIA);
        assertThrows(BusinessException.class, () -> actorWith(media, null, false, List.of()));
        assertThrows(BusinessException.class, () -> actorWith(media, null, true, CAREERS));
        assertThrows(BusinessException.class, () -> new EventRegistrationCareer("2025-13", "작품", null));
        assertThrows(BusinessException.class, () -> new EventRegistrationCareer("2025-09", " ", null));
    }

    @Test
    void producerKeepsAffiliationButNotBirthDateOrPhoto() {
        EventRegistration registration = new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.PRODUCER, "이도현", "010-2345-6789", "dohyun@test.com", " ",
                BIRTH_DATE, " 남극장 · 캐스팅 담당 "
        ), "photo-key", TODAY, NOW);

        assertEquals("남극장 · 캐스팅 담당", registration.getAffiliation());
        assertNull(registration.getSnsHandle());
        assertNull(registration.getBirthDate());
        assertNull(registration.getPhotoKey());
    }

    @Test
    void actorNeedsBirthDateInThePastAndPhoto() {
        assertThrows(BusinessException.class, () -> actor(null, "photo-key"));
        assertThrows(BusinessException.class, () -> actor(TODAY.plusDays(1), "photo-key"));
        assertThrows(BusinessException.class, () -> actor(BIRTH_DATE, null));
    }

    @Test
    void producerNeedsAffiliation() {
        assertThrows(BusinessException.class, () -> new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.PRODUCER, "이도현", "010-2345-6789", "dohyun@test.com", null, null, " "
        ), null, TODAY, NOW));
    }

    @Test
    void rejectsMissingTypeAndMalformedContacts() {
        assertThrows(BusinessException.class, () -> new EventRegistration(1L, new EventRegistrationForm(
                null, "김하늘", "010-1234-5678", "haneul@test.com", null, BIRTH_DATE, null
        ), "photo-key", TODAY, NOW));
        assertThrows(BusinessException.class, () -> withContacts("02-123-4567", "haneul@test.com"));
        assertThrows(BusinessException.class, () -> withContacts("010-1234-5678", "haneul"));
        assertThrows(BusinessException.class, () -> withContacts("010-1234-5678", " "));
    }

    private static EventRegistration actor(LocalDate birthDate, String photoKey) {
        return new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.ACTOR, "김하늘", "010-1234-5678", "haneul@test.com", null, birthDate, null,
                Set.of(EventActivityField.THEATER), null, true, List.of()
        ), photoKey, TODAY, NOW);
    }

    private static EventRegistration actorWith(
            Set<EventActivityField> fields,
            String otherActivity,
            boolean noCareer,
            List<EventRegistrationCareer> careers
    ) {
        return new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.ACTOR, "김하늘", "010-1234-5678", "haneul@test.com", null, BIRTH_DATE, null,
                fields, otherActivity, noCareer, careers
        ), "photo-key", TODAY, NOW);
    }

    private static EventRegistration withContacts(String phone, String email) {
        return new EventRegistration(1L, new EventRegistrationForm(
                EventParticipantType.ACTOR, "김하늘", phone, email, null, BIRTH_DATE, null,
                Set.of(EventActivityField.THEATER), null, true, List.of()
        ), "photo-key", TODAY, NOW);
    }
}
