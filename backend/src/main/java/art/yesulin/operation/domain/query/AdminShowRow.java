package art.yesulin.operation.domain.query;

import art.yesulin.show.domain.ShowStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * 운영 대시보드의 무료 공연 한 건과 회차별 예매 집계다. 예매자 이름·휴대폰과 예매번호는 담지 않는다.
 */
public record AdminShowRow(
        UUID showId,
        String title,
        ShowStatus status,
        String companyName,
        String hostName,
        String externalReservationUrl,
        long externalReservationVisits,
        Instant createdAt,
        long totalCapacity,
        long reservedTickets,
        long reservationCount,
        long canceledReservationCount,
        List<AdminShowSessionRow> sessions
) {

    public static AdminShowRow of(
            UUID showId,
            String title,
            ShowStatus status,
            String companyName,
            String hostName,
            String externalReservationUrl,
            long externalReservationVisits,
            Instant createdAt,
            List<AdminShowSessionRow> sessions
    ) {
        return new AdminShowRow(
                showId,
                title,
                status,
                companyName,
                hostName,
                externalReservationUrl,
                externalReservationVisits,
                createdAt,
                sessions.stream().mapToLong(AdminShowSessionRow::capacity).sum(),
                sessions.stream().mapToLong(AdminShowSessionRow::reservedTickets).sum(),
                sessions.stream().mapToLong(AdminShowSessionRow::reservationCount).sum(),
                sessions.stream().mapToLong(AdminShowSessionRow::canceledReservationCount).sum(),
                List.copyOf(sessions)
        );
    }
}
