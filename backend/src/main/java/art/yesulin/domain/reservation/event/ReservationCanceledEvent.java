package art.yesulin.domain.reservation.event;

public record ReservationCanceledEvent(long reservationId, long sessionId, int ticketCount) {
}
