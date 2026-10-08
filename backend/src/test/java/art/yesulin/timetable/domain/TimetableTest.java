package art.yesulin.timetable.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.timetable.domain.setting.TimeSlot;
import art.yesulin.timetable.domain.setting.TimetableSetting;
import art.yesulin.timetable.domain.setting.TimetableWindow;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class TimetableTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 10);
    private static final TimetableProfile PROFILE = new TimetableProfile(
            "남극장 2차 오디션", "남극장", "010-1234-5678", "", ""
    );

    @Test
    void splitsWindowsIntoSlotsThatFitAndSortsThemByTime() {
        Timetable timetable = timetable(25, 1, List.of(
                window(DAY.plusDays(1), "14:00", "15:00"),
                window(DAY, "10:00", "11:00")
        ));

        assertEquals(List.of(
                new TimeSlot(DAY, LocalTime.of(10, 0)),
                new TimeSlot(DAY, LocalTime.of(10, 25)),
                new TimeSlot(DAY.plusDays(1), LocalTime.of(14, 0)),
                new TimeSlot(DAY.plusDays(1), LocalTime.of(14, 25))
        ), timetable.slots());
        assertEquals(DAY, timetable.getSetting().getWindows().values().getFirst().getDate());
        assertEquals(LocalTime.of(10, 50), timetable.endTimeOf(new TimeSlot(DAY, LocalTime.of(10, 25))));
    }

    @Test
    void createsLastSlotEndingAtMidnightBoundaryWithoutWrapping() {
        Timetable timetable = timetable(30, 1, List.of(window(DAY, "23:00", "23:55")));

        assertEquals(List.of(new TimeSlot(DAY, LocalTime.of(23, 0))), timetable.slots());
    }

    @Test
    void rejectsOverlappingWindowsButAllowsTouchingOnes() {
        assertInvalid(() -> new TimetableSetting(10, 1, List.of(
                window(DAY, "10:00", "12:00"), window(DAY, "11:30", "13:00")
        )));

        TimetableSetting touching = new TimetableSetting(10, 1, List.of(
                window(DAY, "10:00", "12:00"), window(DAY, "12:00", "13:00")
        ));
        assertEquals(2, touching.getWindows().values().size());
    }

    @Test
    void rejectsWindowShorterThanSlotAndTimesOutsideFiveMinuteSteps() {
        assertInvalid(() -> new TimetableSetting(30, 1, List.of(window(DAY, "10:00", "10:20"))));
        assertInvalid(() -> window(DAY, "10:03", "11:00"));
        assertInvalid(() -> window(DAY, "11:00", "11:00"));
        assertInvalid(() -> new TimetableSetting(7, 1, List.of(window(DAY, "10:00", "11:00"))));
        assertInvalid(() -> new TimetableSetting(10, 0, List.of(window(DAY, "10:00", "11:00"))));
        assertInvalid(() -> new TimetableSetting(10, 1, List.of()));
    }

    @Test
    void normalizesProfileAndRequiresMobilePhone() {
        TimetableProfile profile = new TimetableProfile(" 2차 ", " 남극장 ", "010-123-4567", null, " 대본 지참 ");

        assertEquals("2차", profile.getTitle());
        assertEquals("남극장", profile.getOrganizerName());
        assertEquals("", profile.getLocation());
        assertEquals("대본 지참", profile.getGuide());
        assertInvalid(() -> new TimetableProfile("2차", "남극장", "02-123-4567", "", ""));
        assertInvalid(() -> new TimetableProfile("2차", " ", "010-1234-5678", "", ""));
    }

    @Test
    void allowsSelfChangeUntilExactlyTwentyFourHoursBeforeStart() {
        Timetable timetable = timetable(30, 1, List.of(window(DAY, "10:00", "11:00")));
        TimeSlot slot = new TimeSlot(DAY, LocalTime.of(10, 0));

        assertEquals(Instant.parse("2026-10-10T01:00:00Z"), timetable.startInstantOf(slot));
        assertTrue(timetable.isBeforeSelfChangeDeadline(slot, Instant.parse("2026-10-09T01:00:00Z")));
        assertFalse(timetable.isBeforeSelfChangeDeadline(slot, Instant.parse("2026-10-09T01:00:01Z")));
    }

    @Test
    void extendsSavedWindowsButNeverShrinksOrShiftsThem() {
        Timetable timetable = timetable(20, 2, List.of(window(DAY, "10:00", "12:00")));

        timetable.updateSetting(new TimetableSetting(20, 3, List.of(
                window(DAY, "10:00", "12:00"), window(DAY, "12:00", "13:00"), window(DAY.plusDays(1), "14:00", "15:00")
        )));
        timetable.updateSetting(new TimetableSetting(20, 3, List.of(
                window(DAY, "10:00", "13:00"), window(DAY.plusDays(1), "14:00", "15:00")
        )));
        assertEquals(12, timetable.slots().size());

        assertNotExtendable(timetable, new TimetableSetting(20, 3, List.of(window(DAY, "10:00", "13:00"))));
        assertNotExtendable(timetable, new TimetableSetting(20, 3, List.of(
                window(DAY, "10:10", "13:00"), window(DAY.plusDays(1), "14:00", "15:00")
        )));
        assertNotExtendable(timetable, new TimetableSetting(30, 3, List.of(
                window(DAY, "10:00", "13:00"), window(DAY.plusDays(1), "14:00", "15:00")
        )));
        assertNotExtendable(timetable, new TimetableSetting(20, 2, List.of(
                window(DAY, "10:00", "13:00"), window(DAY.plusDays(1), "14:00", "15:00")
        )));
        assertEquals(12, timetable.slots().size());
    }

    @Test
    void generatesUrlSafeKeysAndRejectsMalformedOnes() {
        String key = TimetableKey.generate().getValue();

        assertEquals(Optional.of(new TimetableKey(key)), TimetableKey.parse(key));
        assertTrue(TimetableKey.parse(key.substring(1)).isEmpty());
        assertTrue(TimetableKey.parse(key.substring(1) + "/").isEmpty());
        assertTrue(TimetableKey.parse(null).isEmpty());
    }

    static Timetable timetable(int slotMinutes, int capacity, List<TimetableWindow> windows) {
        return new Timetable(PROFILE, new TimetableSetting(slotMinutes, capacity, windows));
    }

    static TimetableWindow window(LocalDate date, String start, String end) {
        return new TimetableWindow(date, LocalTime.parse(start), LocalTime.parse(end));
    }

    private static void assertNotExtendable(Timetable timetable, TimetableSetting setting) {
        BusinessException exception = assertThrows(BusinessException.class, () -> timetable.updateSetting(setting));
        assertEquals(TimetableErrorCode.SETTING_NOT_EXTENDABLE, exception.getErrorCode());
    }

    private static void assertInvalid(Runnable action) {
        BusinessException exception = assertThrows(BusinessException.class, action::run);
        assertEquals(TimetableErrorCode.INVALID_INPUT, exception.getErrorCode());
    }
}
