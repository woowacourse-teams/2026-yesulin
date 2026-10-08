package art.yesulin.show.domain.reservation;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    /** 예매를 영속성 컨텍스트에 올리지 않고 회차 ID만 읽는다. 회차를 잠근 뒤 예매를 새로 읽기 위해 쓴다. */
    @Query("select reservation.sessionId from Reservation reservation where reservation.id = :id")
    Optional<Long> findSessionIdById(@Param("id") long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select reservation from Reservation reservation where reservation.id = :id")
    Optional<Reservation> findByIdForUpdate(@Param("id") long id);

    @Query("""
            select coalesce(sum(reservation.ticketCount), 0) from Reservation reservation
            where reservation.sessionId = :sessionId and reservation.status = :status
            """)
    long sumTicketCountBySessionIdAndStatus(
            @Param("sessionId") long sessionId,
            @Param("status") ReservationStatus status
    );

    /** 매수를 바꾸는 예매를 뺀 나머지 확정 매수. */
    @Query("""
            select coalesce(sum(reservation.ticketCount), 0) from Reservation reservation
            where reservation.sessionId = :sessionId and reservation.status = :status
              and reservation.id <> :excludedReservationId
            """)
    long sumTicketCountBySessionIdAndStatusExcluding(
            @Param("sessionId") long sessionId,
            @Param("status") ReservationStatus status,
            @Param("excludedReservationId") long excludedReservationId
    );

    @Query("""
            select new art.yesulin.show.domain.reservation.SessionReservedTickets(
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
