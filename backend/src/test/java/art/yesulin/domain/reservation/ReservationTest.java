package art.yesulin.domain.reservation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.common.exception.BusinessException;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class ReservationTest {

    private static final Booker BOOKER = new Booker("홍길동", "010-1234-5678");

    @Test
    void confirmsWithGeneratedReadableCode() {
        Reservation reservation = new Reservation(1L, BOOKER, 2, "privacy-v1");

        assertTrue(reservation.isConfirmed());
        assertTrue(reservation.getCode().matches("[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}"));
        assertNull(reservation.getCanceledAt());
    }

    @Test
    void acceptsOneToTenTickets() {
        BusinessException zero = assertThrows(
                BusinessException.class, () -> new Reservation(1L, BOOKER, 0, "privacy-v1")
        );
        BusinessException eleven = assertThrows(
                BusinessException.class, () -> new Reservation(1L, BOOKER, 11, "privacy-v1")
        );

        assertEquals(ReservationErrorCode.INVALID_INPUT, zero.getErrorCode());
        assertEquals(ReservationErrorCode.INVALID_INPUT, eleven.getErrorCode());
        assertEquals(10, new Reservation(1L, BOOKER, 10, "privacy-v1").getTicketCount());
    }

    @Test
    void rejectsPhoneWithoutHyphenFormat() {
        BusinessException exception = assertThrows(
                BusinessException.class, () -> new Booker("홍길동", "01012345678")
        );

        assertEquals(ReservationErrorCode.INVALID_INPUT, exception.getErrorCode());
    }

    @Test
    void keepsFirstCancellationTime() {
        Reservation reservation = new Reservation(1L, BOOKER, 2, "privacy-v1");
        ReflectionTestUtils.setField(reservation, "id", 1L);
        Instant firstCanceledAt = Instant.parse("2026-10-01T10:00:00Z");

        reservation.cancel(firstCanceledAt);
        reservation.cancel(firstCanceledAt.plusSeconds(60));

        assertFalse(reservation.isConfirmed());
        assertEquals(ReservationStatus.CANCELED, reservation.getStatus());
        assertEquals(firstCanceledAt, reservation.getCanceledAt());
    }
}
