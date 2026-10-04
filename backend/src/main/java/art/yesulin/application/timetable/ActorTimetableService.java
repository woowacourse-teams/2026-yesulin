package art.yesulin.application.timetable;

import static art.yesulin.domain.timetable.TimetableErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.timetable.Timetable;
import art.yesulin.domain.timetable.TimetableBoard;
import art.yesulin.domain.timetable.TimetableKey;
import art.yesulin.domain.timetable.TimetableRepository;
import art.yesulin.domain.timetable.actor.TimetableActor;
import art.yesulin.domain.timetable.actor.TimetableActorRepository;
import art.yesulin.domain.timetable.request.TimetableRequest;
import art.yesulin.domain.timetable.request.TimetableRequestRepository;
import art.yesulin.domain.timetable.request.TimetableRequestStatus;
import art.yesulin.domain.timetable.setting.TimeSlot;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 배우가 문자로 받은 개인 링크로 자기 일정을 보고, 기획사가 정한 바운더리 안의 빈 시간으로 직접 옮긴다.
 * 바운더리는 기획사가 미리 허락한 범위이므로 옮기면 바로 확정한다. 맞는 시간이 없을 때만 기획사에게 요청을 남긴다.
 * 링크는 확정 뒤 안내를 받은 배우만 열 수 있다.
 */
@Service
@RequiredArgsConstructor
public class ActorTimetableService {

    private final TimetableRepository timetableRepository;
    private final TimetableActorRepository actorRepository;
    private final TimetableRequestRepository requestRepository;
    private final TimetableMessenger messenger;
    private final Clock clock;

    @Transactional(readOnly = true)
    public ActorTimetableResult find(String accessKey) {
        TimetableActor actor = TimetableKey.parse(accessKey)
                .flatMap(actorRepository::findByAccessKey)
                .orElseThrow(this::notFound);
        Timetable timetable = timetableRepository.findById(actor.getTimetableId()).orElseThrow(this::notFound);
        return resultOf(visible(new Access(timetable, actorsOf(timetable), actor)));
    }

    /** 다른 배우가 같은 칸을 동시에 고르거나 기획사가 동시에 옮겨도 정원을 넘지 않게 일정표 행을 잠근다. */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ActorTimetableResult changeSlot(String accessKey, TimeSlot current, TimeSlot next) {
        Access access = lock(accessKey);
        Instant now = clock.instant();
        new TimetableBoard(access.timetable(), access.actors())
                .moveByActor(access.actor().getId(), current, next, now);
        requestRepository.findFirstByActorIdAndStatus(access.actor().getId(), TimetableRequestStatus.OPEN)
                .ifPresent(request -> request.resolve(now));
        return resultOf(access);
    }

    /** 바운더리 안에 맞는 시간이 없을 때 기획사에게 사정을 남긴다. 열린 요청이 있으면 내용을 바꾼다. */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ActorTimetableResult requestTime(String accessKey, String message) {
        Access access = lock(accessKey);
        long actorId = access.actor().getId();
        requestRepository.findFirstByActorIdAndStatus(actorId, TimetableRequestStatus.OPEN)
                .ifPresentOrElse(
                        request -> request.rewrite(message),
                        () -> requestRepository.save(new TimetableRequest(access.timetable().getId(), actorId, message))
                );
        messenger.timeRequest(access.timetable())
                .ifPresent(notice -> messenger.queue(access.timetable(), List.of(notice)));
        return resultOf(access);
    }

    private Access lock(String accessKey) {
        TimetableKey key = TimetableKey.parse(accessKey).orElseThrow(this::notFound);
        long timetableId = actorRepository.findTimetableIdByAccessKey(key).orElseThrow(this::notFound);
        Timetable timetable = timetableRepository.findByIdForUpdate(timetableId).orElseThrow(this::notFound);
        List<TimetableActor> actors = actorsOf(timetable);
        TimetableActor actor = actors.stream()
                .filter(candidate -> candidate.getAccessKey().equals(key))
                .findFirst()
                .orElseThrow(this::notFound);
        return visible(new Access(timetable, actors, actor));
    }

    /** 확정 전 일정표나 아직 안내하지 않은 배우의 링크는 없는 것으로 다룬다. */
    private Access visible(Access access) {
        if (!access.timetable().isPublished() || !access.actor().isInvited()) {
            throw notFound();
        }
        return access;
    }

    private ActorTimetableResult resultOf(Access access) {
        Timetable timetable = access.timetable();
        TimetableActor actor = access.actor();
        Instant now = clock.instant();
        TimetableBoard board = new TimetableBoard(timetable, access.actors());
        TimeSlot slot = actor.getSlot();
        ActorTimetableResult.Request request = requestRepository
                .findFirstByActorIdAndStatus(actor.getId(), TimetableRequestStatus.OPEN)
                .map(open -> new ActorTimetableResult.Request(open.getMessage(), open.getCreatedAt()))
                .orElse(null);
        return new ActorTimetableResult(
                timetable.getProfile().getTitle(),
                timetable.getProfile().getOrganizerName(),
                timetable.getProfile().getLocation(),
                timetable.getProfile().getGuide(),
                actor.getName(),
                TimeSlotResult.of(slot, timetable),
                board.selfChangeStatusOf(actor, now),
                slot == null ? null : timetable.startInstantOf(slot).minus(Timetable.SELF_CHANGE_NOTICE),
                Timetable.SELF_CHANGE_NOTICE.toHours(),
                board.openSlotsFor(actor.getId(), now).stream()
                        .map(open -> TimeSlotResult.of(open, timetable))
                        .toList(),
                request
        );
    }

    private List<TimetableActor> actorsOf(Timetable timetable) {
        return actorRepository.findAllByTimetableIdOrderByIdAsc(timetable.getId());
    }

    private BusinessException notFound() {
        return new BusinessException(NOT_FOUND, "일정을 찾을 수 없습니다. 문자로 받은 링크를 다시 확인해 주세요.");
    }

    private record Access(Timetable timetable, List<TimetableActor> actors, TimetableActor actor) {
    }
}
