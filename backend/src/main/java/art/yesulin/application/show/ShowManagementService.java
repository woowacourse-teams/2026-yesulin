package art.yesulin.application.show;

import static art.yesulin.domain.show.ShowErrorCode.HAS_RESERVATIONS;
import static art.yesulin.domain.show.ShowErrorCode.INVALID_INPUT;
import static art.yesulin.domain.show.ShowErrorCode.NOT_FOUND;
import static art.yesulin.domain.show.ShowErrorCode.SESSION_HAS_RESERVATIONS;
import static art.yesulin.domain.show.ShowErrorCode.SESSION_NOT_FOUND;

import art.yesulin.application.file.FileReferenceService;
import art.yesulin.application.file.LinkFileCommand;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.reservation.ReservationRepository;
import art.yesulin.domain.reservation.ReservationStatus;
import art.yesulin.domain.show.Show;
import art.yesulin.domain.show.ShowRepository;
import art.yesulin.domain.show.ShowSession;
import art.yesulin.domain.show.ShowSessionRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 기획사/제작사가 자기 무료 공연과 회차를 관리한다. 다른 기획사의 공연은 찾을 수 없는 것으로 다룬다.
 */
@Service
@RequiredArgsConstructor
public class ShowManagementService {

    static final String POSTER_REFERENCE_TYPE = "SHOW_POSTER";
    static final String IMAGE_REFERENCE_TYPE = "SHOW_IMAGE";
    private static final List<String> FILE_REFERENCE_TYPES = List.of(POSTER_REFERENCE_TYPE, IMAGE_REFERENCE_TYPE);

    private final ShowRepository showRepository;
    private final ShowSessionRepository sessionRepository;
    private final ReservationRepository reservationRepository;
    private final FileReferenceService fileReferenceService;
    private final FileReferenceRepository fileReferenceRepository;
    private final Clock clock;

    @Transactional
    public ProducerShowResult create(long ownerId, SaveShowCommand command) {
        Show show = showRepository.saveAndFlush(command.toShow(ownerId));
        linkFiles(show);
        return result(show);
    }

    @Transactional(readOnly = true)
    public List<ProducerShowSummaryResult> findAll(long ownerId) {
        List<Show> shows = showRepository.findAllByOwnerIdOrderByCreatedAtDescIdDesc(ownerId);
        Map<Long, List<ShowSession>> sessionsByShow = sessionsByShow(shows);
        Instant now = clock.instant();
        return shows.stream()
                .map(show -> summary(show, sessionsByShow.getOrDefault(show.getId(), List.of()), now))
                .toList();
    }

    @Transactional(readOnly = true)
    public ProducerShowResult find(long ownerId, UUID showId) {
        return result(getOwnedShow(ownerId, showId));
    }

    @Transactional
    public ProducerShowResult update(long ownerId, UUID showId, SaveShowCommand command) {
        Show show = getOwnedShow(ownerId, showId);
        command.applyTo(show);
        fileReferenceRepository.deleteByReferenceTypeInAndReferenceId(FILE_REFERENCE_TYPES, show.getId());
        linkFiles(show);
        return result(show);
    }

    @Transactional
    public void delete(long ownerId, UUID showId) {
        Show show = getOwnedShow(ownerId, showId);
        List<ShowSession> sessions = sessionRepository.findAllByShowIdOrderByStartsAtAscIdAsc(show.getId());
        if (!sessions.isEmpty() && reservationRepository.existsBySessionIdIn(sessionIds(sessions))) {
            throw new BusinessException(HAS_RESERVATIONS, "예매 기록이 있는 공연은 삭제할 수 없습니다. 예매를 마감해 주세요.");
        }
        sessionRepository.deleteAll(sessions);
        fileReferenceRepository.deleteByReferenceTypeInAndReferenceId(FILE_REFERENCE_TYPES, show.getId());
        showRepository.delete(show);
    }

    @Transactional
    public ProducerShowResult open(long ownerId, UUID showId) {
        Show show = getOwnedShow(ownerId, showId);
        show.open(clock.instant(), sessionRepository.findAllByShowIdOrderByStartsAtAscIdAsc(show.getId()));
        return result(show);
    }

    @Transactional
    public ProducerShowResult close(long ownerId, UUID showId) {
        Show show = getOwnedShow(ownerId, showId);
        show.close();
        return result(show);
    }

    @Transactional
    public ProducerShowResult addSession(long ownerId, UUID showId, SaveShowSessionCommand command) {
        Show show = getOwnedShow(ownerId, showId);
        sessionRepository.save(new ShowSession(show.getId(), requireFuture(command.startsAt()), command.capacity()));
        return result(show);
    }

    /** 예매와 같은 회차 행 잠금을 잡아 정원을 줄이는 사이에 예매가 끼어들지 못하게 한다. */
    @Transactional
    public ProducerShowResult updateSession(long ownerId, UUID showId, long sessionId, SaveShowSessionCommand command) {
        Show show = getOwnedShow(ownerId, showId);
        ShowSession session = getSessionForUpdate(show, sessionId);
        long reservedTickets = reservationRepository.sumTicketCountBySessionIdAndStatus(
                session.getId(), ReservationStatus.CONFIRMED
        );
        session.update(requireFuture(command.startsAt()), command.capacity(), reservedTickets);
        return result(show);
    }

    @Transactional
    public ProducerShowResult deleteSession(long ownerId, UUID showId, long sessionId) {
        Show show = getOwnedShow(ownerId, showId);
        ShowSession session = getSessionForUpdate(show, sessionId);
        if (reservationRepository.existsBySessionId(session.getId())) {
            throw new BusinessException(SESSION_HAS_RESERVATIONS, "예매 기록이 있는 회차는 삭제할 수 없습니다.");
        }
        sessionRepository.delete(session);
        sessionRepository.flush();
        return result(show);
    }

    private Show getOwnedShow(long ownerId, UUID showId) {
        return showRepository.findByPublicIdAndOwnerId(showId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공연을 찾을 수 없습니다."));
    }

    private ShowSession getSessionForUpdate(Show show, long sessionId) {
        return sessionRepository.findByIdForUpdate(sessionId)
                .filter(session -> session.getShowId() == show.getId())
                .orElseThrow(() -> new BusinessException(SESSION_NOT_FOUND, "공연 회차를 찾을 수 없습니다."));
    }

    private Instant requireFuture(Instant startsAt) {
        if (startsAt == null || !startsAt.isAfter(clock.instant())) {
            throw new BusinessException(INVALID_INPUT, "회차 시작 시각은 현재 이후로 입력해 주세요.");
        }
        return startsAt;
    }

    /** 파일 소유자와 업로드 완료 여부는 FileReferenceService가 확인한다. */
    private void linkFiles(Show show) {
        fileReferenceService.linkFile(new LinkFileCommand(
                show.getOwnerId(), show.getPosterFileId(), POSTER_REFERENCE_TYPE, show.getId()
        ));
        show.getImageFileIds().forEach(fileId -> fileReferenceService.linkFile(new LinkFileCommand(
                show.getOwnerId(), fileId, IMAGE_REFERENCE_TYPE, show.getId()
        )));
    }

    private ProducerShowResult result(Show show) {
        List<ShowSession> sessions = sessionRepository.findAllByShowIdOrderByStartsAtAscIdAsc(show.getId());
        return ProducerShowResult.of(show, sessions, SessionTickets.of(reservationRepository, sessions));
    }

    private ProducerShowSummaryResult summary(Show show, List<ShowSession> sessions, Instant now) {
        SessionTickets tickets = SessionTickets.of(reservationRepository, sessions);
        Instant nextSessionStartsAt = sessions.stream()
                .filter(session -> session.isBookableAt(now))
                .findFirst()
                .map(ShowSession::getStartsAt)
                .orElse(null);
        return new ProducerShowSummaryResult(
                show.getPublicId(),
                show.getOwnerId(),
                show.getTitle(),
                show.getGenre(),
                show.getPosterFileId(),
                show.getStatus(),
                sessions.size(),
                tickets.totalReserved(),
                nextSessionStartsAt,
                show.getCreatedAt()
        );
    }

    private Map<Long, List<ShowSession>> sessionsByShow(List<Show> shows) {
        if (shows.isEmpty()) {
            return Map.of();
        }
        return sessionRepository.findAllByShowIdInOrderByStartsAtAscIdAsc(shows.stream().map(Show::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(ShowSession::getShowId));
    }

    private static Collection<Long> sessionIds(List<ShowSession> sessions) {
        return sessions.stream().map(ShowSession::getId).toList();
    }
}
