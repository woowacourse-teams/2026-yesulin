package art.yesulin.actor.domain.page;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.actor.domain.profile.ProfileBasicInformation;
import art.yesulin.actor.domain.profile.ProfileGender;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class ActorPageReadinessTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 27);

    @Test
    void listsEveryMissingRequirementWithoutRequiringHeightAndWeight() {
        ActorPageReadiness empty = ActorPageReadiness.assess(
                null, ProfileBasicInformation.empty(), false, false, TODAY
        );
        assertEquals(List.of(ActorPageMissingField.values()), empty.missing());
        assertFalse(empty.ready());
        assertEquals(empty, ActorPageReadiness.assess(null, null, false, false, TODAY));
        assertTrue(ActorPageReadiness.assess("actor", basic(TODAY.minusYears(14)), true, false, TODAY).ready());
    }

    @Test
    void recognizesTheDayBeforeAndTheFourteenthBirthday() {
        LocalDate birthDate = TODAY.minusYears(14);
        assertTrue(ActorPageReadiness.assess("actor", basic(birthDate), true, false, TODAY.minusDays(1)).underAge());
        assertFalse(ActorPageReadiness.assess("actor", basic(birthDate), true, false, TODAY).underAge());
    }

    @Test
    void reportsEachMissingFieldIndividually() {
        assertEquals(List.of(ActorPageMissingField.HANDLE), 
                readiness(null, "배우", ProfileGender.FEMALE, TODAY.minusYears(20), true).missing());
        assertEquals(List.of(ActorPageMissingField.NAME), 
                readiness("actor", null, ProfileGender.FEMALE, TODAY.minusYears(20), true).missing());
        assertEquals(List.of(ActorPageMissingField.GENDER), 
                readiness("actor", "배우", null, TODAY.minusYears(20), true).missing());
        assertEquals(List.of(ActorPageMissingField.BIRTH_DATE), 
                readiness("actor", "배우", ProfileGender.FEMALE, null, true).missing());
        assertEquals(List.of(ActorPageMissingField.PUBLIC_PHOTO), 
                readiness("actor", "배우", ProfileGender.FEMALE, TODAY.minusYears(20), false).missing());
    }

    @Test
    void lockPreventsReadinessEvenWhenAllFieldsArePresent() {
        ActorPageReadiness result = ActorPageReadiness.assess("actor", basic(TODAY.minusYears(20)), true, true, TODAY);
        assertTrue(result.locked());
        assertFalse(result.ready());
        assertTrue(result.missing().isEmpty());
    }

    private ActorPageReadiness readiness(
            String handle, String name, ProfileGender gender, LocalDate birth, boolean photo
    ) {
        return ActorPageReadiness.assess(handle, new ProfileBasicInformation(
                name, null, null, birth, gender, null, null, null, TODAY
        ), photo, false, TODAY);
    }

    private ProfileBasicInformation basic(LocalDate birthDate) {
        return new ProfileBasicInformation("배우", null, null, birthDate, ProfileGender.FEMALE, null, null, null, TODAY);
    }
}
