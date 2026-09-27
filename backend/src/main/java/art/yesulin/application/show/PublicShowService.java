package art.yesulin.application.show;

import static art.yesulin.domain.show.ShowErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.reservation.Reservation;
import art.yesulin.domain.reservation.ReservationRepository;
import art.yesulin.domain.show.Show;
import art.yesulin.domain.show.ShowRepository;
import art.yesulin.domain.show.ShowSession;
import art.yesulin.domain.show.ShowSessionRepository;
import art.yesulin.domain.show.ShowStatus;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 로그인 없는 관객에게 예매 중인 공연과 회차별 잔여석을 보여 준다. 정원과 예매 수는 따로 내보내지 않는다.
 */
@Service
@RequiredArgsConstructor
public class PublicShowService {

    private final ShowRepository showRepository;
    private final ShowSessionRepository sessionRepository;
    private final ReservationRepository reservationRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<PublicShowSummaryResult> findOpenShows() {
        List<Show> shows = showRepository.findAllByStatusOrderByCreatedAtDescIdDesc(ShowStatus.OPEN);
        if (shows.isEmpty()) {
            return List.of();
        }
        Map<Long, List<ShowSession>> sessionsByShow = sessionRepository
                .findAllByShowIdInOrderByStartsAtAscIdAsc(shows.stream().map(Show::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(ShowSession::getShowId));
        Instant now = clock.instant();
        return shows.stream()
                .map(show -> new PublicShowSummaryResult(
                        show.getPublicId(),
                        show.getOwnerId(),
                        show.getTitle(),
                        show.getGenre(),
                        show.getPosterFileId(),
                        show.getVenue().getName(),
                        nextSessionStartsAt(sessionsByShow.getOrDefault(show.getId(), List.of()), now),
                        show.getRunningMinutes()
                ))
                .toList();
    }

    /** 초안 공연은 존재를 드러내지 않고, 마감 공연은 링크로 들어온 관객에게 예매 종료로 보여 준다. */
    @Transactional(readOnly = true)
    public PublicShowResult find(UUID showId) {
        Show show = showRepository.findByPublicId(showId)
                .filter(Show::isPublic)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공연을 찾을 수 없습니다."));
        List<ShowSession> sessions = sessionRepository.findAllByShowIdOrderByStartsAtAscIdAsc(show.getId());
        SessionTickets tickets = SessionTickets.of(reservationRepository, sessions);
        Instant now = clock.instant();
        boolean open = show.getStatus() == ShowStatus.OPEN;
        return new PublicShowResult(
                show.getPublicId(),
                show.getOwnerId(),
                show.getTitle(),
                show.getGenre(),
                show.getDescription(),
                show.getPosterFileId(),
                show.getImageFileIds(),
                ShowVenueResult.from(show.getVenue()),
                show.getRunningMinutes(),
                show.getAgeRating(),
                show.getInquiryPhone(),
                show.getStatus(),
                Reservation.MAX_TICKET_COUNT,
                sessions.stream()
                        .map(session -> {
                            long remainingSeats = session.remainingSeats(tickets.reserved(session));
                            boolean bookable = open && session.isBookableAt(now) && remainingSeats > 0;
                            return new PublicShowSessionResult(
                                    session.getId(), session.getStartsAt(), remainingSeats, bookable
                            );
                        })
                        .toList()
        );
    }

    private static Instant nextSessionStartsAt(List<ShowSession> sessions, Instant now) {
        return sessions.stream()
                .filter(session -> session.isBookableAt(now))
                .findFirst()
                .map(ShowSession::getStartsAt)
                .orElse(null);
    }
}
