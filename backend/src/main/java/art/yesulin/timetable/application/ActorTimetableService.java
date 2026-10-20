package art.yesulin.timetable.application;

import static art.yesulin.timetable.domain.TimetableErrorCode.NOT_FOUND;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.timetable.domain.Timetable;
import art.yesulin.timetable.domain.TimetableKey;
import art.yesulin.timetable.domain.TimetableRepository;
import art.yesulin.timetable.domain.actor.TimetableActor;
import art.yesulin.timetable.domain.actor.TimetableActorRepository;
import art.yesulin.timetable.domain.actor.TimetableAttendance;
import art.yesulin.timetable.domain.request.TimetableRequest;
import art.yesulin.timetable.domain.request.TimetableRequestRepository;
import art.yesulin.timetable.domain.request.TimetableRequestStatus;
import java.time.Clock;
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
        return resultOf(visible(new Access(timetable, actor)));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ActorTimetableResult answerAttendance(String accessKey, TimetableAttendance answer) {
        Access access = lock(accessKey);
        access.actor().answerAttendance(answer, clock.instant());
        return resultOf(access);
    }

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
        TimetableActor actor = actorRepository.findByAccessKey(key).orElseThrow(this::notFound);
        return visible(new Access(timetable, actor));
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
                TimeSlotResult.of(actor.getSlot(), timetable),
                actor.getAttendance(),
                request
        );
    }

    private BusinessException notFound() {
        return new BusinessException(NOT_FOUND, "일정을 찾을 수 없습니다. 문자로 받은 링크를 다시 확인해 주세요.");
    }

    private record Access(Timetable timetable, TimetableActor actor) {
    }
}
