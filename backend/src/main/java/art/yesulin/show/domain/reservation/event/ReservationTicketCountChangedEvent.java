package art.yesulin.show.domain.reservation.event;

public record ReservationTicketCountChangedEvent(
        long reservationId, long sessionId, int previousTicketCount, int ticketCount
) {
}
