package art.yesulin.show.domain.reservation.event;

public record ReservationConfirmedEvent(long reservationId, long sessionId, int ticketCount) {
}
