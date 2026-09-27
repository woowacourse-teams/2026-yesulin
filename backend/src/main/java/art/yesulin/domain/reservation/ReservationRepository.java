package art.yesulin.domain.reservation;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    @Query("""
            select coalesce(sum(reservation.ticketCount), 0) from Reservation reservation
            where reservation.sessionId = :sessionId and reservation.status = :status
            """)
    long sumTicketCountBySessionIdAndStatus(
            @Param("sessionId") long sessionId,
            @Param("status") ReservationStatus status
    );

    @Query("""
            select new art.yesulin.domain.reservation.SessionReservedTickets(
                reservation.sessionId, sum(reservation.ticketCount)
            )
            from Reservation reservation
            where reservation.sessionId in :sessionIds and reservation.status = :status
            group by reservation.sessionId
            """)
    List<SessionReservedTickets> sumTicketCountsBySessionIds(
            @Param("sessionIds") Collection<Long> sessionIds,
            @Param("status") ReservationStatus status
    );

    @Query("""
            select distinct reservation.sessionId from Reservation reservation
            where reservation.sessionId in :sessionIds
            """)
    List<Long> findSessionIdsWithReservations(@Param("sessionIds") Collection<Long> sessionIds);

    boolean existsBySessionIdAndBookerPhoneAndStatus(long sessionId, String phone, ReservationStatus status);

    boolean existsByCode(String code);

    boolean existsBySessionIdIn(Collection<Long> sessionIds);

    boolean existsBySessionId(long sessionId);

    List<Reservation> findAllBySessionIdOrderByCreatedAtAscIdAsc(long sessionId);
}
