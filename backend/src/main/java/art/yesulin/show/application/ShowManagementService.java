package art.yesulin.show.application;

import static art.yesulin.show.domain.ShowErrorCode.HAS_RESERVATIONS;
import static art.yesulin.show.domain.ShowErrorCode.INVALID_INPUT;
import static art.yesulin.show.domain.ShowErrorCode.NOT_FOUND;
import static art.yesulin.show.domain.ShowErrorCode.SESSION_HAS_RESERVATIONS;
import static art.yesulin.show.domain.ShowErrorCode.SESSION_NOT_FOUND;

import art.yesulin.file.application.FileReferenceService;
import art.yesulin.file.application.FileUsageService;
import art.yesulin.file.application.LinkFileCommand;
import art.yesulin.file.domain.FileReferenceRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.producer.domain.Producer;
import art.yesulin.producer.domain.ProducerRepository;
import art.yesulin.show.domain.ExternalReservationVisitRepository;
import art.yesulin.show.domain.Show;
import art.yesulin.show.domain.ShowRepository;
import art.yesulin.show.domain.ShowSession;
import art.yesulin.show.domain.ShowSessionRepository;
import art.yesulin.show.domain.reservation.ReservationRepository;
import art.yesulin.show.domain.reservation.ReservationStatus;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 기획사/제작사가 자기 무료 공연과 회차를 관리한다. 다른 기획사의 공연은 찾을 수 없는 것으로 다룬다.
 * 공연을 이미 찾은 뒤의 동작({@code Show}를 받는 메서드)은 운영자 공연을 관리하는
 * {@link AdminShowManagementService}도 같은 트랜잭션 안에서 쓴다.
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
    private final FileUsageService fileUsageService;
    private final ProducerRepository producerRepository;
    private final ExternalReservationVisitRepository visitRepository;
    private final Clock clock;

    @Transactional
    public ProducerShowResult create(long ownerId, SaveShowCommand command) {
        return create(command.toShow(ownerId));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public ProducerShowResult create(Show newShow) {
        Show show = showRepository.saveAndFlush(newShow);
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
        return relinkFiles(show);
    }

    /** 공연 정보를 바꾼 뒤 포스터·상세 이미지 참조를 새 값으로 다시 건다. */
    @Transactional(propagation = Propagation.MANDATORY)
    public ProducerShowResult relinkFiles(Show show) {
        List<Long> removedFileIds = referencedFileIds(show.getId());
        fileReferenceRepository.deleteByReferenceTypeInAndReferenceId(FILE_REFERENCE_TYPES, show.getId());
        fileUsageService.markReferencesRemoved(removedFileIds);
        linkFiles(show);
        return result(show);
    }

    /**
     * 모든 회차 행을 잠근 뒤 예매 기록을 확인해, 확인과 삭제 사이에 들어온 예매가 삭제를 DB 오류로 만들지 못하게 한다.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void delete(long ownerId, UUID showId) {
        delete(getOwnedShow(ownerId, showId));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void delete(Show show) {
        List<ShowSession> sessions = sessionRepository.findAllByShowIdForUpdate(show.getId());
        if (!sessions.isEmpty() && reservationRepository.existsBySessionIdIn(sessionIds(sessions))) {
            throw new BusinessException(HAS_RESERVATIONS, "예매 기록이 있는 공연은 삭제할 수 없습니다. 예매를 마감해 주세요.");
        }
        sessionRepository.deleteAll(sessions);
        if (show.usesExternalReservation()) {
            visitRepository.deleteByShowId(show.getId());
        }
        List<Long> removedFileIds = referencedFileIds(show.getId());
        fileReferenceRepository.deleteByReferenceTypeInAndReferenceId(FILE_REFERENCE_TYPES, show.getId());
        fileUsageService.markReferencesRemoved(removedFileIds);
        showRepository.delete(show);
    }

    @Transactional
    public ProducerShowResult open(long ownerId, UUID showId) {
        return open(getOwnedShow(ownerId, showId));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public ProducerShowResult open(Show show) {
        show.open(clock.instant(), sessionRepository.findAllByShowIdOrderByStartsAtAscIdAsc(show.getId()));
        return result(show);
    }

    @Transactional
    public ProducerShowResult close(long ownerId, UUID showId) {
        return close(getOwnedShow(ownerId, showId));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public ProducerShowResult close(Show show) {
        show.close();
        return result(show);
    }

    @Transactional
    public ProducerShowResult addSession(long ownerId, UUID showId, SaveShowSessionCommand command) {
        return addSession(getOwnedShow(ownerId, showId), command);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public ProducerShowResult addSession(Show show, SaveShowSessionCommand command) {
        Instant startsAt = requireFuture(command.startsAt());
        sessionRepository.save(show.usesExternalReservation()
                ? ShowSession.withoutCapacity(show.getId(), startsAt)
                : new ShowSession(show.getId(), startsAt, command.capacity()));
        return result(show);
    }

    /**
     * 예매와 같은 회차 행 잠금을 잡아 정원을 줄이는 사이에 예매가 끼어들지 못하게 한다.
     * 잠금 뒤 확정 매수를 최신 값으로 읽도록 예매와 같이 READ COMMITTED로 실행한다.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ProducerShowResult updateSession(long ownerId, UUID showId, long sessionId, SaveShowSessionCommand command) {
        return updateSession(getOwnedShow(ownerId, showId), sessionId, command);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public ProducerShowResult updateSession(Show show, long sessionId, SaveShowSessionCommand command) {
        ShowSession session = getSessionForUpdate(show, sessionId);
        if (show.usesExternalReservation()) {
            session.reschedule(requireFuture(command.startsAt()));
            return result(show);
        }
        long reservedTickets = reservationRepository.sumTicketCountBySessionIdAndStatus(
                session.getId(), ReservationStatus.CONFIRMED
        );
        session.update(requireFuture(command.startsAt()), command.capacity(), reservedTickets);
        return result(show);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ProducerShowResult deleteSession(long ownerId, UUID showId, long sessionId) {
        return deleteSession(getOwnedShow(ownerId, showId), sessionId);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public ProducerShowResult deleteSession(Show show, long sessionId) {
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

    private List<Long> referencedFileIds(long showId) {
        return fileReferenceRepository.findAllByReferenceTypeInAndReferenceId(FILE_REFERENCE_TYPES, showId)
                .stream().map(reference -> reference.getFileId()).distinct().toList();
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public ProducerShowResult result(Show show) {
        List<ShowSession> sessions = sessionRepository.findAllByShowIdOrderByStartsAtAscIdAsc(show.getId());
        String defaultHostName = producerRepository.findByMemberId(show.getOwnerId())
                .map(Producer::getCompanyName)
                .orElse("");
        long externalReservationVisits = show.usesExternalReservation()
                ? visitRepository.countByShowId(show.getId())
                : 0;
        return ProducerShowResult.of(
                show, defaultHostName, sessions, SessionTickets.of(reservationRepository, sessions),
                externalReservationVisits
        );
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
