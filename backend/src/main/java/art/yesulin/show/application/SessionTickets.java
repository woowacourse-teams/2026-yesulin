package art.yesulin.show.application;

import art.yesulin.show.domain.ShowSession;
import art.yesulin.show.domain.reservation.ReservationRepository;
import art.yesulin.show.domain.reservation.ReservationStatus;
import art.yesulin.show.domain.reservation.SessionReservedTickets;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 회차 목록의 확정 매수와 예매 기록 존재 여부를 한 번에 읽는다. 잔여석은 저장하지 않고 이 값으로 계산한다.
 */
final class SessionTickets {

    private final Map<Long, Long> reservedTickets;
    private final Set<Long> sessionIdsWithReservations;

    private SessionTickets(Map<Long, Long> reservedTickets, Set<Long> sessionIdsWithReservations) {
        this.reservedTickets = reservedTickets;
        this.sessionIdsWithReservations = sessionIdsWithReservations;
    }

    static SessionTickets of(ReservationRepository repository, List<ShowSession> sessions) {
        List<Long> sessionIds = sessions.stream().map(ShowSession::getId).toList();
        if (sessionIds.isEmpty()) {
            return new SessionTickets(Map.of(), Set.of());
        }
        Map<Long, Long> reserved = repository.sumTicketCountsBySessionIds(sessionIds, ReservationStatus.CONFIRMED)
                .stream()
                .collect(Collectors.toMap(SessionReservedTickets::sessionId, SessionReservedTickets::reservedTickets));
        return new SessionTickets(reserved, Set.copyOf(repository.findSessionIdsWithReservations(sessionIds)));
    }

    long reserved(ShowSession session) {
        return reservedTickets.getOrDefault(session.getId(), 0L);
    }

    long totalReserved() {
        return reservedTickets.values().stream().mapToLong(Long::longValue).sum();
    }

    boolean hasReservations(ShowSession session) {
        return sessionIdsWithReservations.contains(session.getId());
    }

    boolean hasAnyReservations() {
        return !sessionIdsWithReservations.isEmpty();
    }
}
