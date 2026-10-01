package art.yesulin.application.show;

import static art.yesulin.domain.show.ShowErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.producer.Producer;
import art.yesulin.domain.producer.ProducerRepository;
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
 * 로그인 없는 관객에게 예매 중인 공연과 회차별 잔여석을 보여 준다. 정원과 예매 수는 따로 내보내지 않고,
 * 공연이 잔여석을 숨기면 잔여석 숫자도 내보내지 않는다.
 */
@Service
@RequiredArgsConstructor
public class PublicShowService {

    private final ShowRepository showRepository;
    private final ShowSessionRepository sessionRepository;
    private final ReservationRepository reservationRepository;
    private final ProducerRepository producerRepository;
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
        Map<Long, String> companyNames = producerRepository
                .findAllByMemberIdIn(shows.stream().map(Show::getOwnerId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(Producer::getMemberId, Producer::getCompanyName, (first, second) -> first));
        Instant now = clock.instant();
        return shows.stream()
                .map(show -> new PublicShowSummaryResult(
                        show.getPublicId(),
                        show.getOwnerId(),
                        show.hostNameOr(companyNames.getOrDefault(show.getOwnerId(), "")),
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
        String companyName = producerRepository.findByMemberId(show.getOwnerId())
                .map(Producer::getCompanyName)
                .orElse("");
        return new PublicShowResult(
                show.getPublicId(),
                show.getOwnerId(),
                show.hostNameOr(companyName),
                show.getTitle(),
                show.getGenre(),
                show.getDescription(),
                show.getPosterFileId(),
                show.getImageFileIds(),
                ShowVenueResult.from(show.getVenue()),
                show.getGuides().stream().map(ShowGuideResult::from).toList(),
                show.getRunningMinutes(),
                show.getAgeRating(),
                show.getInquiryPhone(),
                show.getLinks().stream().map(ShowLinkResult::from).toList(),
                show.getStatus(),
                Reservation.MAX_TICKET_COUNT,
                sessions.stream()
                        .map(session -> sessionResult(show, session, tickets.reserved(session), open, now))
                        .toList()
        );
    }

    /** 잔여석을 숨겨도 매수 상한은 잔여석까지다. 잔여석이 1회 최대 매수보다 적으면 상한으로 드러나는 것은 허용한다. */
    private static PublicShowSessionResult sessionResult(
            Show show, ShowSession session, long reservedTickets, boolean open, Instant now
    ) {
        long remainingSeats = session.remainingSeats(reservedTickets);
        boolean bookable = open && session.isBookableAt(now) && remainingSeats > 0;
        int maxTicketCount = (int) Math.min(Reservation.MAX_TICKET_COUNT, remainingSeats);
        return new PublicShowSessionResult(
                session.getId(),
                session.getStartsAt(),
                show.isRemainingSeatsVisible() ? remainingSeats : null,
                maxTicketCount,
                bookable
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
