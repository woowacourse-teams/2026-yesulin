package art.yesulin.application.reservation;

import art.yesulin.domain.reservation.Reservation;
import art.yesulin.domain.reservation.ReservationStatus;
import java.time.Instant;

public record ProducerReservationResult(
        long id,
        String code,
        String bookerName,
        String bookerPhone,
        int ticketCount,
        ReservationStatus status,
        Instant createdAt,
        Instant canceledAt
) {

    static ProducerReservationResult from(Reservation reservation) {
        return new ProducerReservationResult(
                reservation.getId(),
                reservation.getCode(),
                reservation.getBooker().getName(),
                reservation.getBooker().getPhone(),
                reservation.getTicketCount(),
                reservation.getStatus(),
                reservation.getCreatedAt(),
                reservation.getCanceledAt()
        );
    }
}
