package art.yesulin.application.reservation;

import static art.yesulin.domain.reservation.ReservationErrorCode.DUPLICATE;
import static art.yesulin.domain.reservation.ReservationErrorCode.INVALID_INPUT;
import static art.yesulin.domain.reservation.ReservationErrorCode.NOT_FOUND;
import static art.yesulin.domain.show.ShowErrorCode.SESSION_NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.reservation.Booker;
import art.yesulin.domain.reservation.Reservation;
import art.yesulin.domain.reservation.ReservationRepository;
import art.yesulin.domain.reservation.ReservationStatus;
import art.yesulin.domain.show.Show;
import art.yesulin.domain.show.ShowErrorCode;
import art.yesulin.domain.show.ShowRepository;
import art.yesulin.domain.show.ShowSession;
import art.yesulin.domain.show.ShowSessionRepository;
import java.time.Clock;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReservationService {

    /** 예매 화면에 보여 주는 개인정보 수집·이용 안내 문구의 버전. 문구를 바꾸면 함께 올린다. */
    static final String PRIVACY_DOCUMENT_VERSION = "show-reservation-privacy-2026-09-28";

    private final ShowRepository showRepository;
    private final ShowSessionRepository sessionRepository;
    private final ReservationRepository reservationRepository;
    private final Clock clock;

    /**
     * 한 회차의 예매는 모두 회차 행 잠금을 거친다. 잠금 안에서 중복 번호와 확정 매수를 다시 읽어
     * 동시에 들어온 예매가 정원을 넘기거나 같은 번호로 두 번 확정되지 않게 한다.
     */
    @Transactional
    public ReservationReceiptResult reserve(UUID showId, long sessionId, ReserveCommand command) {
        Show show = showRepository.findByPublicId(showId)
                .filter(Show::isPublic)
                .orElseThrow(() -> new BusinessException(ShowErrorCode.NOT_FOUND, "공연을 찾을 수 없습니다."));
        ShowSession session = sessionRepository.findByIdForUpdate(sessionId)
                .filter(found -> found.getShowId() == show.getId())
                .orElseThrow(() -> new BusinessException(SESSION_NOT_FOUND, "공연 회차를 찾을 수 없습니다."));
        show.ensureOpen();
        if (!command.privacyAgreed()) {
            throw new BusinessException(INVALID_INPUT, "개인정보 수집·이용에 동의해야 예매할 수 있습니다.");
        }
        Reservation reservation = newReservation(session, command);
        if (reservationRepository.existsBySessionIdAndBookerPhoneAndStatus(
                session.getId(), reservation.getBooker().getPhone(), ReservationStatus.CONFIRMED)) {
            throw new BusinessException(DUPLICATE, "이 휴대폰 번호로 이미 예매한 회차입니다.");
        }
        long reservedTickets = reservationRepository.sumTicketCountBySessionIdAndStatus(
                session.getId(), ReservationStatus.CONFIRMED
        );
        session.ensureReservable(clock.instant(), reservedTickets, reservation.getTicketCount());
        Reservation saved = reservationRepository.save(reservation);
        return new ReservationReceiptResult(
                saved.getCode(), show.getTitle(), session.getStartsAt(), saved.getTicketCount(),
                saved.getBooker().getName()
        );
    }

    @Transactional(readOnly = true)
    public ProducerReservationListResult findSessionReservations(long ownerId, UUID showId, long sessionId) {
        Show show = showRepository.findByPublicIdAndOwnerId(showId, ownerId)
                .orElseThrow(() -> new BusinessException(ShowErrorCode.NOT_FOUND, "공연을 찾을 수 없습니다."));
        ShowSession session = sessionRepository.findById(sessionId)
                .filter(found -> found.getShowId() == show.getId())
                .orElseThrow(() -> new BusinessException(SESSION_NOT_FOUND, "공연 회차를 찾을 수 없습니다."));
        return new ProducerReservationListResult(
                reservationRepository.findAllBySessionIdOrderByCreatedAtAscIdAsc(session.getId()).stream()
                        .map(ProducerReservationResult::from)
                        .toList()
        );
    }

    /** 관객의 전화 요청을 받은 기획사가 취소한다. 다른 기획사 공연의 예매는 찾을 수 없는 것으로 다룬다. */
    @Transactional
    public ProducerReservationResult cancel(long ownerId, long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .filter(found -> isOwnedBy(found, ownerId))
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "예매를 찾을 수 없습니다."));
        reservation.cancel(clock.instant());
        return ProducerReservationResult.from(reservationRepository.save(reservation));
    }

    private boolean isOwnedBy(Reservation reservation, long ownerId) {
        return sessionRepository.findById(reservation.getSessionId())
                .flatMap(session -> showRepository.findById(session.getShowId()))
                .filter(show -> show.getOwnerId() == ownerId)
                .isPresent();
    }

    /** 예매번호 충돌 확률은 매우 낮지만 unique 제약 위반으로 트랜잭션이 깨지지 않게 저장 전에 한 번 더 고른다. */
    private Reservation newReservation(ShowSession session, ReserveCommand command) {
        Booker booker = new Booker(command.bookerName(), command.bookerPhone());
        Reservation reservation = new Reservation(
                session.getId(), booker, command.ticketCount(), PRIVACY_DOCUMENT_VERSION
        );
        while (reservationRepository.existsByCode(reservation.getCode())) {
            reservation = new Reservation(session.getId(), booker, command.ticketCount(), PRIVACY_DOCUMENT_VERSION);
        }
        return reservation;
    }
}
