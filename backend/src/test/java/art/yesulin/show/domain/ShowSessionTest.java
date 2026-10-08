package art.yesulin.show.domain;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.global.exception.BusinessException;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class ShowSessionTest {

    private static final Instant STARTS_AT = Instant.parse("2026-10-10T10:00:00Z");

    @Test
    void externalReservationSessionHasNoSeatsAndOnlyMovesStartTime() {
        ShowSession session = ShowSession.withoutCapacity(1L, STARTS_AT);

        assertEquals(0, session.getCapacity());
        assertEquals(0, session.remainingSeats(0));
        assertEquals(ShowErrorCode.SESSION_NOT_ENOUGH_SEATS, assertThrows(BusinessException.class,
                () -> session.ensureReservable(STARTS_AT.minusSeconds(60), 0, 1)).getErrorCode());

        session.reschedule(STARTS_AT.plusSeconds(3600));

        assertEquals(STARTS_AT.plusSeconds(3600), session.getStartsAt());
        assertEquals(0, session.getCapacity());
    }

    @Test
    void closesBookingAtStartTime() {
        ShowSession session = new ShowSession(1L, STARTS_AT, 30);

        BusinessException exception = assertThrows(
                BusinessException.class, () -> session.ensureReservable(STARTS_AT, 0, 1)
        );

        assertEquals(ShowErrorCode.SESSION_BOOKING_CLOSED, exception.getErrorCode());
        assertDoesNotThrow(() -> session.ensureReservable(STARTS_AT.minusNanos(1), 0, 1));
    }

    @Test
    void rejectsRequestExceedingRemainingSeats() {
        ShowSession session = new ShowSession(1L, STARTS_AT, 30);
        Instant now = STARTS_AT.minusSeconds(3600);

        BusinessException exception = assertThrows(
                BusinessException.class, () -> session.ensureReservable(now, 25, 6)
        );

        assertEquals(ShowErrorCode.SESSION_NOT_ENOUGH_SEATS, exception.getErrorCode());
        assertDoesNotThrow(() -> session.ensureReservable(now, 25, 5));
        assertEquals(5, session.remainingSeats(25));
    }

    @Test
    void rejectsCapacityBelowReservedTickets() {
        ShowSession session = new ShowSession(1L, STARTS_AT, 30);

        BusinessException exception = assertThrows(
                BusinessException.class, () -> session.update(STARTS_AT, 19, 20)
        );
        session.update(STARTS_AT.plusSeconds(3600), 20, 20);

        assertEquals(ShowErrorCode.SESSION_CAPACITY_BELOW_RESERVED, exception.getErrorCode());
        assertEquals(20, session.getCapacity());
        assertEquals(STARTS_AT.plusSeconds(3600), session.getStartsAt());
    }

    @Test
    void rejectsEmptyCapacity() {
        BusinessException exception = assertThrows(
                BusinessException.class, () -> new ShowSession(1L, STARTS_AT, 0)
        );

        assertEquals(ShowErrorCode.INVALID_INPUT, exception.getErrorCode());
    }
}
