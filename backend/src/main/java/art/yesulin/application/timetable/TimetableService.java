package art.yesulin.application.timetable;

import static art.yesulin.domain.timetable.TimetableErrorCode.ACTOR_NOT_FOUND;
import static art.yesulin.domain.timetable.TimetableErrorCode.DUPLICATE_ACTOR;
import static art.yesulin.domain.timetable.TimetableErrorCode.INVALID_INPUT;
import static art.yesulin.domain.timetable.TimetableErrorCode.NOT_FOUND;
import static art.yesulin.domain.timetable.TimetableErrorCode.REQUEST_NOT_FOUND;
import static art.yesulin.domain.timetable.TimetableErrorCode.TOO_MANY_ACTORS;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.timetable.Timetable;
import art.yesulin.domain.timetable.TimetableActor;
import art.yesulin.domain.timetable.TimetableActorRepository;
import art.yesulin.domain.timetable.TimetableBoard;
import art.yesulin.domain.timetable.TimetableKey;
import art.yesulin.domain.timetable.TimetableMessage;
import art.yesulin.domain.timetable.TimetableRepository;
import art.yesulin.domain.timetable.TimetableRequestRepository;
import art.yesulin.domain.timetable.TimetableRequestStatus;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 기획사가 관리 링크로 일정표를 만들고 고친다. 로그인 대신 관리 링크 열쇠로 일정표를 찾는다.
 * 배정을 바꾸는 작업은 배우의 직접 변경과 같은 일정표 행 잠금을 거쳐 정원을 넘지 않게 한다. 잠금 뒤 읽는 배우가
 * 최신 커밋 값이 되도록 READ COMMITTED로 실행한다.
 */
@Service
@RequiredArgsConstructor
public class TimetableService {

    public static final int MAX_ACTORS = 300;

    private final TimetableRepository timetableRepository;
    private final TimetableActorRepository actorRepository;
    private final TimetableRequestRepository requestRepository;
    private final TimetableMessenger messenger;
    private final Clock clock;

    /** 관리 링크는 화면에도 보여 주고, 잃어버리지 않게 기획사 번호로도 보낸다. */
    @Transactional
    public TimetableCreatedResult create(CreateTimetableCommand command) {
        Timetable timetable = timetableRepository.save(new Timetable(
                TimetableKey.generate(), command.profile().toProfile(), command.setting().toSetting()
        ));
        messenger.queue(timetable, List.of(messenger.organizerLink(timetable)));
        return new TimetableCreatedResult(timetable.getManageKey(), boardOf(timetable, List.of()));
    }

    @Transactional(readOnly = true)
    public TimetableBoardResult find(String manageKey) {
        if (!TimetableKey.isWellFormed(manageKey)) {
            throw notFound();
        }
        Timetable timetable = timetableRepository.findByManageKey(manageKey).orElseThrow(this::notFound);
        return boardOf(timetable, actorsOf(timetable));
    }

    @Transactional
    public TimetableBoardResult updateProfile(String manageKey, TimetableProfileCommand command) {
        Timetable timetable = lock(manageKey);
        timetable.updateProfile(command.toProfile());
        return boardOf(timetable, actorsOf(timetable));
    }

    /**
     * 시간대 설정과 기획사가 옮긴 배정을 함께 저장한다. 저장 뒤 모든 배정이 바운더리와 정원을 지켜야 한다.
     * 확정한 일정표라면 시간이 바뀐 배우에게 변경 안내를, 새로 시간을 받은 배우에게 첫 안내를 보낸다.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public TimetableBoardResult saveBoard(String manageKey, SaveTimetableBoardCommand command) {
        Timetable timetable = lock(manageKey);
        List<TimetableActor> actors = actorsOf(timetable);
        timetable.updateSetting(command.setting().toSetting());
        TimetableBoard board = new TimetableBoard(timetable, actors);
        List<TimetableActor> moved = board.reassign(command.assignments());
        board.ensureValid();
        if (timetable.isPublished()) {
            announceChanges(timetable, actors, moved);
        }
        return boardOf(timetable, actors);
    }

    /** 한 명씩 또는 여러 명을 한 번에 등록한다. 새 배우는 시간이 비어 있다. 같은 번호는 한 번만 등록한다. */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public TimetableBoardResult registerActors(String manageKey, List<ActorContactCommand> contacts) {
        Timetable timetable = lock(manageKey);
        if (contacts.isEmpty()) {
            throw new BusinessException(INVALID_INPUT, "등록할 배우를 한 명 이상 입력해 주세요.");
        }
        List<TimetableActor> actors = new ArrayList<>(actorsOf(timetable));
        if (actors.size() + contacts.size() > MAX_ACTORS) {
            throw new BusinessException(TOO_MANY_ACTORS, "한 일정표에는 배우를 %d명까지 등록할 수 있습니다.", MAX_ACTORS);
        }
        Map<String, String> namesByPhone = new HashMap<>();
        actors.forEach(actor -> namesByPhone.put(actor.getPhone(), actor.getName()));
        List<TimetableActor> registered = new ArrayList<>();
        for (ActorContactCommand contact : contacts) {
            TimetableActor actor = new TimetableActor(
                    timetable.getId(), TimetableKey.generate(), contact.name(), contact.phone()
            );
            String existing = namesByPhone.putIfAbsent(actor.getPhone(), actor.getName());
            if (existing != null) {
                throw new BusinessException(DUPLICATE_ACTOR, "%s 번호는 ‘%s’ 배우로 이미 등록돼 있습니다.",
                        actor.getPhone(), existing);
            }
            registered.add(actor);
        }
        actors.addAll(actorRepository.saveAll(registered));
        return boardOf(timetable, actors);
    }

    /** 명단에서 빼면 개인 링크가 더 열리지 않고, 아직 보내지 않은 문자와 열린 요청도 지운다. */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public TimetableBoardResult removeActor(String manageKey, long actorId) {
        Timetable timetable = lock(manageKey);
        TimetableActor actor = actorRepository.findById(actorId)
                .filter(found -> found.getTimetableId() == timetable.getId())
                .orElseThrow(() -> new BusinessException(ACTOR_NOT_FOUND, "배우를 찾을 수 없습니다."));
        requestRepository.deleteAllByActorId(actor.getId());
        messenger.discardPending(actor);
        actorRepository.delete(actor);
        actorRepository.flush();
        return boardOf(timetable, actorsOf(timetable));
    }

    /** 일정을 확정하고 모든 배우에게 합격·일정 안내 문자를 보낸다. */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public TimetableBoardResult publish(String manageKey) {
        Timetable timetable = lock(manageKey);
        List<TimetableActor> actors = actorsOf(timetable);
        Instant now = clock.instant();
        List<TimetableMessage> messages = new ArrayList<>();
        for (TimetableActor actor : new TimetableBoard(timetable, actors).publish(now)) {
            actor.markInvited(now);
            messages.add(messenger.invitation(timetable, actor));
        }
        messenger.queue(timetable, messages);
        return boardOf(timetable, actors);
    }

    @Transactional
    public TimetableBoardResult changeSelfChangeLock(String manageKey, boolean locked) {
        Timetable timetable = lock(manageKey);
        timetable.changeSelfChangeLock(locked);
        return boardOf(timetable, actorsOf(timetable));
    }

    /** 배우를 직접 옮기지 않고 전화 등으로 해결한 요청을 닫는다. 이미 닫힌 요청은 그대로 둔다. */
    @Transactional
    public TimetableBoardResult resolveRequest(String manageKey, long requestId) {
        Timetable timetable = lock(manageKey);
        requestRepository.findById(requestId)
                .filter(request -> request.getTimetableId() == timetable.getId())
                .orElseThrow(() -> new BusinessException(REQUEST_NOT_FOUND, "요청을 찾을 수 없습니다."))
                .resolve(clock.instant());
        return boardOf(timetable, actorsOf(timetable));
    }

    private void announceChanges(Timetable timetable, List<TimetableActor> actors, List<TimetableActor> moved) {
        Instant now = clock.instant();
        List<TimetableMessage> messages = new ArrayList<>();
        for (TimetableActor actor : moved) {
            if (actor.isInvited()) {
                messenger.scheduleChange(timetable, actor).ifPresent(messages::add);
            }
        }
        for (TimetableActor actor : actors) {
            if (actor.isAssigned() && !actor.isInvited()) {
                actor.markInvited(now);
                messages.add(messenger.invitation(timetable, actor));
            }
        }
        if (!moved.isEmpty()) {
            requestRepository.findAllByActorIdInAndStatus(
                    moved.stream().map(TimetableActor::getId).toList(), TimetableRequestStatus.OPEN
            ).forEach(request -> request.resolve(now));
        }
        messenger.queue(timetable, messages);
    }

    private Timetable lock(String manageKey) {
        if (!TimetableKey.isWellFormed(manageKey)) {
            throw notFound();
        }
        return timetableRepository.findByManageKeyForUpdate(manageKey).orElseThrow(this::notFound);
    }

    private List<TimetableActor> actorsOf(Timetable timetable) {
        return actorRepository.findAllByTimetableIdOrderByIdAsc(timetable.getId());
    }

    private TimetableBoardResult boardOf(Timetable timetable, List<TimetableActor> actors) {
        return TimetableBoardResult.of(timetable, actors, requestRepository
                .findAllByTimetableIdAndStatusOrderByCreatedAtAscIdAsc(timetable.getId(), TimetableRequestStatus.OPEN));
    }

    private BusinessException notFound() {
        return new BusinessException(NOT_FOUND, "일정표를 찾을 수 없습니다. 관리 링크를 다시 확인해 주세요.");
    }
}
