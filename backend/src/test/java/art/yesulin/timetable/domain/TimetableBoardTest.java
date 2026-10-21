package art.yesulin.timetable.domain;

import static art.yesulin.timetable.domain.TimetableTest.timetable;
import static art.yesulin.timetable.domain.TimetableTest.window;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.global.exception.ErrorCode;
import art.yesulin.timetable.domain.actor.SlotAssignment;
import art.yesulin.timetable.domain.actor.TimetableActor;
import art.yesulin.timetable.domain.setting.TimeSlot;
import art.yesulin.timetable.domain.setting.TimetableSetting;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class TimetableBoardTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 10);
    private static final TimeSlot TEN = new TimeSlot(DAY, LocalTime.of(10, 0));
    private static final TimeSlot TEN_THIRTY = new TimeSlot(DAY, LocalTime.of(10, 30));
    private static final TimeSlot ELEVEN = new TimeSlot(DAY, LocalTime.of(11, 0));
    /** 10월 10일 10:00(한국 시간)까지 일주일 남은 시각. */
    private static final Instant NOW = Instant.parse("2026-10-03T01:00:00Z");

    private Timetable timetable;
    private TimetableActor first;
    private TimetableActor second;

    @BeforeEach
    void setUp() {
        timetable = timetable(30, 1, List.of(window(DAY, "10:00", "11:30")));
        ReflectionTestUtils.setField(timetable, "id", 1L);
        first = actor(10L, "김배우", "010-1111-1111");
        second = actor(11L, "이배우", "010-2222-2222");
    }

    @Test
    void reassignsMovedActorsAndRejectsStalePreviousSlot() {
        TimetableBoard board = board();

        List<TimetableActor> moved = board.reassign(List.of(
                new SlotAssignment(10L, null, TEN),
                new SlotAssignment(11L, null, null)
        ));

        assertEquals(List.of(first), moved);
        assertEquals(TEN, first.getSlot());
        assertCode(TimetableErrorCode.ASSIGNMENT_CONFLICT,
                () -> board.reassign(List.of(new SlotAssignment(10L, TEN_THIRTY, ELEVEN))));
        assertCode(TimetableErrorCode.INVALID_INPUT, () -> board.reassign(List.of(
                new SlotAssignment(11L, null, TEN_THIRTY), new SlotAssignment(11L, TEN_THIRTY, ELEVEN)
        )));
        assertCode(TimetableErrorCode.ACTOR_NOT_FOUND,
                () -> board.reassign(List.of(new SlotAssignment(99L, null, TEN))));
    }

    @Test
    void rejectsSlotsOutsideBoundaryAndOverCapacity() {
        TimetableBoard board = board();
        board.reassign(List.of(new SlotAssignment(10L, null, new TimeSlot(DAY, LocalTime.of(10, 15)))));
        assertCode(TimetableErrorCode.SLOT_UNAVAILABLE, board::ensureValid);

        board.reassign(List.of(
                new SlotAssignment(10L, new TimeSlot(DAY, LocalTime.of(10, 15)), TEN),
                new SlotAssignment(11L, null, TEN)
        ));
        assertCode(TimetableErrorCode.SLOT_UNAVAILABLE, board::ensureValid);

        timetable.updateSetting(new TimetableSetting(30, 2, List.of(window(DAY, "10:00", "11:30"))));
        board.ensureValid();
    }

    @Test
    void publishesOnlyWhenEveryActorHasSlot() {
        TimetableBoard board = board();
        board.reassign(List.of(new SlotAssignment(10L, null, TEN)));
        assertCode(TimetableErrorCode.NOT_PUBLISHABLE, () -> board.publish(NOW));
        assertCode(TimetableErrorCode.NOT_PUBLISHABLE, () -> new TimetableBoard(timetable, List.of()).publish(NOW));

        board.reassign(List.of(new SlotAssignment(11L, null, TEN_THIRTY)));
        List<TimetableActor> invitees = board.publish(NOW);

        assertEquals(List.of(first, second), invitees);
        assertTrue(timetable.isPublished());
        assertEquals(NOW, timetable.getPublishedAt());
        assertCode(TimetableErrorCode.NOT_PUBLISHABLE, () -> board.publish(NOW));
    }

    @Test
    void keepsInvitedActorsAssignedAfterPublishing() {
        TimetableBoard board = publishedBoard();

        board.reassign(List.of(new SlotAssignment(10L, TEN, null)));

        assertCode(TimetableErrorCode.INVALID_INPUT, board::ensureValid);
    }

    private TimetableBoard publishedBoard() {
        TimetableBoard board = board();
        board.reassign(List.of(new SlotAssignment(10L, null, TEN), new SlotAssignment(11L, null, TEN_THIRTY)));
        board.publish(NOW).forEach(actor -> actor.markInvited(NOW));
        return board;
    }

    private TimetableBoard board() {
        return new TimetableBoard(timetable, List.of(first, second));
    }

    private TimetableActor actor(long id, String name, String phone) {
        TimetableActor actor = new TimetableActor(1L, name, phone);
        ReflectionTestUtils.setField(actor, "id", id);
        return actor;
    }

    private void assertCode(ErrorCode expected, Runnable action) {
        BusinessException exception = assertThrows(BusinessException.class, action::run);
        assertEquals(expected, exception.getErrorCode());
    }
}
