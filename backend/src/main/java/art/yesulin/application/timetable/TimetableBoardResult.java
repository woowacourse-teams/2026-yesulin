package art.yesulin.application.timetable;

import art.yesulin.domain.timetable.Timetable;
import art.yesulin.domain.timetable.TimetableActor;
import art.yesulin.domain.timetable.TimetableRequest;
import art.yesulin.domain.timetable.TimetableStatus;
import art.yesulin.domain.timetable.TimetableWindow;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** 기획사 관리 화면 전체. 관리 링크를 가진 사람만 받으므로 배우 번호를 포함한다. */
public record TimetableBoardResult(
        String title,
        String organizerName,
        String organizerPhone,
        String location,
        String guide,
        TimetableStatus status,
        Instant publishedAt,
        boolean selfChangeLocked,
        long selfChangeNoticeHours,
        int slotMinutes,
        int slotCapacity,
        List<Window> windows,
        List<Actor> actors,
        List<Request> requests
) {

    static TimetableBoardResult of(Timetable timetable, List<TimetableActor> actors, List<TimetableRequest> requests) {
        Map<Long, TimetableActor> actorsById = actors.stream()
                .collect(Collectors.toMap(TimetableActor::getId, Function.identity()));
        return new TimetableBoardResult(
                timetable.getTitle(),
                timetable.getOrganizerName(),
                timetable.getOrganizerPhone(),
                timetable.getLocation(),
                timetable.getGuide(),
                timetable.getStatus(),
                timetable.getPublishedAt(),
                timetable.isSelfChangeLocked(),
                Timetable.SELF_CHANGE_NOTICE.toHours(),
                timetable.getSlotMinutes(),
                timetable.getSlotCapacity(),
                timetable.getWindows().stream().map(Window::from).toList(),
                actors.stream().map(actor -> Actor.of(actor, timetable)).toList(),
                requests.stream()
                        .filter(request -> actorsById.containsKey(request.getActorId()))
                        .map(request -> Request.of(request, actorsById.get(request.getActorId())))
                        .toList()
        );
    }

    public record Window(LocalDate date, LocalTime startTime, LocalTime endTime) {

        static Window from(TimetableWindow window) {
            return new Window(window.getDate(), window.getStartTime(), window.getEndTime());
        }
    }

    /**
     * {@code previousSlot}과 {@code actorChangedAt}은 배우가 링크에서 직접 바꿨을 때만 값이 있다.
     * {@code registeredAt}이 일정표 확정 시각보다 늦으면 확정 뒤에 등록한 추가 합격자다.
     */
    public record Actor(
            long id,
            String name,
            String phone,
            TimeSlotResult slot,
            boolean invited,
            TimeSlotResult previousSlot,
            Instant actorChangedAt,
            Instant registeredAt
    ) {

        static Actor of(TimetableActor actor, Timetable timetable) {
            return new Actor(
                    actor.getId(),
                    actor.getName(),
                    actor.getPhone(),
                    TimeSlotResult.of(actor.getSlot(), timetable),
                    actor.isInvited(),
                    TimeSlotResult.of(actor.getPreviousSlot(), timetable),
                    actor.getActorChangedAt(),
                    actor.getCreatedAt()
            );
        }
    }

    public record Request(long id, long actorId, String actorName, String message, Instant createdAt) {

        static Request of(TimetableRequest request, TimetableActor actor) {
            return new Request(
                    request.getId(), actor.getId(), actor.getName(), request.getMessage(), request.getCreatedAt()
            );
        }
    }
}
