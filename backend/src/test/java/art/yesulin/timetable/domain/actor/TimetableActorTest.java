package art.yesulin.timetable.domain.actor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.timetable.domain.setting.TimeSlot;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import org.junit.jupiter.api.Test;

class TimetableActorTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 10);
    private static final Instant NOW = Instant.parse("2026-10-03T01:00:00Z");

    @Test
    void answersAttendanceAndAsksAgainWhenOrganizerMovesActor() {
        TimetableActor actor = new TimetableActor(1L, "김배우", "010-1111-1111");
        actor.assign(new TimeSlot(DAY, LocalTime.of(10, 0)));
        assertEquals(TimetableAttendance.UNANSWERED, actor.getAttendance());

        actor.answerAttendance(TimetableAttendance.ABSENT, NOW);
        assertEquals(TimetableAttendance.ABSENT, actor.getAttendance());
        assertEquals(NOW, actor.getAttendanceAnsweredAt());

        actor.assign(new TimeSlot(DAY, LocalTime.of(11, 0)));
        assertEquals(TimetableAttendance.UNANSWERED, actor.getAttendance());
        assertNull(actor.getAttendanceAnsweredAt());
    }

    @Test
    void rejectsUnansweredAsAnswer() {
        TimetableActor actor = new TimetableActor(1L, "김배우", "010-1111-1111");

        assertThrows(BusinessException.class, () -> actor.answerAttendance(TimetableAttendance.UNANSWERED, NOW));
    }
}
