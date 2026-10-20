package art.yesulin.timetable.domain;

import static art.yesulin.global.validation.DomainValidator.requireNonNull;
import static art.yesulin.timetable.domain.TimetableErrorCode.ACTOR_NOT_FOUND;
import static art.yesulin.timetable.domain.TimetableErrorCode.ASSIGNMENT_CONFLICT;
import static art.yesulin.timetable.domain.TimetableErrorCode.INVALID_INPUT;
import static art.yesulin.timetable.domain.TimetableErrorCode.NOT_PUBLISHABLE;
import static art.yesulin.timetable.domain.TimetableErrorCode.SLOT_UNAVAILABLE;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.timetable.domain.actor.SlotAssignment;
import art.yesulin.timetable.domain.actor.TimetableActor;
import art.yesulin.timetable.domain.setting.TimeSlot;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * 한 일정표의 시간 칸과 배우 배정을 함께 다룬다. 정원은 여러 배우에 걸친 규칙이라 일정표 행을 잠근 application
 * service가 그 일정표의 배우를 모두 읽어 만든 뒤에만 사용한다.
 */
public class TimetableBoard {

    private final Timetable timetable;
    private final Map<Long, TimetableActor> actors = new LinkedHashMap<>();

    public TimetableBoard(Timetable timetable, List<TimetableActor> actors) {
        this.timetable = requireNonNull(timetable, "일정표는 필수입니다.");
        for (TimetableActor actor : requireNonNull(actors, "배우 목록은 필수입니다.")) {
            if (actor.getTimetableId() != timetable.getId()) {
                throw new IllegalArgumentException("다른 일정표의 배우는 함께 배정할 수 없습니다.");
            }
            this.actors.put(actor.getId(), actor);
        }
    }

    /** 화면이 본 이전 시간이 지금과 다르면 다른 화면에서 먼저 옮긴 것이므로 덮어쓰지 않는다. */
    public List<TimetableActor> reassign(List<SlotAssignment> assignments) {
        Set<Long> seen = new HashSet<>();
        List<TimetableActor> moved = new ArrayList<>();
        for (SlotAssignment assignment : requireNonNull(assignments, "배정 목록은 필수입니다.")) {
            if (!seen.add(assignment.actorId())) {
                throw new BusinessException(INVALID_INPUT, "같은 배우를 한 번에 두 번 옮길 수 없습니다.");
            }
            TimetableActor actor = actor(assignment.actorId());
            if (!Objects.equals(actor.getSlot(), assignment.previous())) {
                throw new BusinessException(ASSIGNMENT_CONFLICT,
                        "‘%s’ 배우의 시간이 그사이 바뀌었습니다. 새로 불러온 뒤 다시 옮겨 주세요.", actor.getName());
            }
            if (Objects.equals(assignment.previous(), assignment.next())) {
                continue;
            }
            actor.assign(assignment.next());
            moved.add(actor);
        }
        return moved;
    }

    /** 저장 직전에 모든 배정이 바운더리 안에 있고 칸마다 정원을 넘지 않는지 확인한다. */
    public void ensureValid() {
        Set<TimeSlot> offered = new HashSet<>(timetable.slots());
        Map<TimeSlot, Integer> counts = new HashMap<>();
        for (TimetableActor actor : actors.values()) {
            TimeSlot slot = actor.getSlot();
            if (slot == null) {
                ensureMayStayUnassigned(actor);
                continue;
            }
            if (!offered.contains(slot)) {
                throw new BusinessException(SLOT_UNAVAILABLE,
                        "‘%s’ 배우의 시간(%s)이 정한 시간대에서 벗어났습니다.", actor.getName(), slot.label());
            }
            int count = counts.merge(slot, 1, Integer::sum);
            if (count > timetable.getSetting().getSlotCapacity()) {
                throw new BusinessException(SLOT_UNAVAILABLE, "%s 칸에 정원 %d명보다 많은 배우가 배정됐습니다.",
                        slot.label(), timetable.getSetting().getSlotCapacity());
            }
        }
    }

    /** 확정하려면 배우가 한 명 이상 있고 모두 시간이 정해져 있어야 한다. 확정하면 안내할 배우를 돌려준다. */
    public List<TimetableActor> publish(Instant now) {
        if (timetable.isPublished()) {
            throw new BusinessException(NOT_PUBLISHABLE, "이미 확정한 일정표입니다.");
        }
        if (actors.isEmpty()) {
            throw new BusinessException(NOT_PUBLISHABLE, "배우를 한 명 이상 등록해 주세요.");
        }
        long unassigned = actors.values().stream().filter(actor -> !actor.isAssigned()).count();
        if (unassigned > 0) {
            throw new BusinessException(NOT_PUBLISHABLE, "아직 시간이 정해지지 않은 배우가 %d명 있습니다.", unassigned);
        }
        ensureValid();
        timetable.publish(now);
        return List.copyOf(actors.values());
    }

    /** 확정 뒤 안내를 받은 배우는 링크에서 볼 시간이 있어야 하므로 미배정으로 되돌릴 수 없다. */
    private void ensureMayStayUnassigned(TimetableActor actor) {
        if (timetable.isPublished() && actor.isInvited()) {
            throw new BusinessException(INVALID_INPUT,
                    "안내를 받은 ‘%s’ 배우는 시간을 비워 둘 수 없습니다. 다른 시간으로 옮기거나 명단에서 빼 주세요.",
                    actor.getName());
        }
    }

    private TimetableActor actor(long actorId) {
        TimetableActor actor = actors.get(actorId);
        if (actor == null) {
            throw new BusinessException(ACTOR_NOT_FOUND, "배우를 찾을 수 없습니다. 새로 불러온 뒤 다시 시도해 주세요.");
        }
        return actor;
    }
}
