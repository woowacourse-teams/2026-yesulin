package art.yesulin.show.application;

import static art.yesulin.show.domain.ShowErrorCode.INVALID_STATUS;
import static art.yesulin.show.domain.ShowErrorCode.NOT_FOUND;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.producer.domain.Producer;
import art.yesulin.producer.domain.ProducerRepository;
import art.yesulin.show.domain.ExternalReservationVisit;
import art.yesulin.show.domain.ExternalReservationVisitRepository;
import art.yesulin.show.domain.Show;
import art.yesulin.show.domain.ShowRepository;
import art.yesulin.show.domain.ShowSession;
import art.yesulin.show.domain.ShowSessionRepository;
import art.yesulin.show.domain.ShowStatus;
import art.yesulin.show.domain.reservation.Reservation;
import art.yesulin.show.domain.reservation.ReservationRepository;
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
 * 공연이 잔여석을 숨기거나 외부 페이지에서 예매받으면 잔여석 숫자도 내보내지 않는다.
 */
@Service
@RequiredArgsConstructor
public class PublicShowService {

    private final ShowRepository showRepository;
    private final ShowSessionRepository sessionRepository;
    private final ReservationRepository reservationRepository;
    private final ProducerRepository producerRepository;
    private final ExternalReservationVisitRepository visitRepository;
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
                show.getExternalReservationUrl(),
                show.getStatus(),
                Reservation.MAX_TICKET_COUNT,
                sessions.stream()
                        .map(session -> sessionResult(show, session, tickets.reserved(session), open, now))
                        .toList()
        );
    }

    /** 관객이 외부 링크 공연에서 예매하기를 눌러 외부 예매 페이지로 간 기록을 남긴다. 예매 중인 공연만 받는다. */
    @Transactional
    public void recordExternalReservationVisit(UUID showId) {
        Show show = showRepository.findByPublicId(showId)
                .filter(Show::isPublic)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공연을 찾을 수 없습니다."));
        show.ensureOpen();
        if (!show.usesExternalReservation()) {
            throw new BusinessException(INVALID_STATUS, "외부 링크로 예매받는 공연이 아닙니다.");
        }
        visitRepository.save(new ExternalReservationVisit(show.getId()));
    }

    /** 잔여석을 숨겨도 매수 상한은 잔여석까지다. 잔여석이 1회 최대 매수보다 적으면 상한으로 드러나는 것은 허용한다. */
    private static PublicShowSessionResult sessionResult(
            Show show, ShowSession session, long reservedTickets, boolean open, Instant now
    ) {
        if (show.usesExternalReservation()) {
            return externalSessionResult(session, open, now);
        }
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

    /**
     * 외부 페이지에서 예매받는 공연은 잔여석을 알 수 없어 시작 전 회차를 모두 예매 가능으로 보여 주고,
     * 예술in에서 매수를 고르지 않으므로 매수 상한은 0으로 둔다.
     */
    private static PublicShowSessionResult externalSessionResult(ShowSession session, boolean open, Instant now) {
        return new PublicShowSessionResult(
                session.getId(), session.getStartsAt(), null, 0, open && session.isBookableAt(now)
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
