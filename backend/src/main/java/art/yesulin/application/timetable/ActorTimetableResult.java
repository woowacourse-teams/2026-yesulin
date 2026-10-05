package art.yesulin.application.timetable;

import art.yesulin.domain.timetable.actor.SelfChangeStatus;
import java.time.Instant;
import java.util.List;

/**
 * 배우 개인 링크 화면. 다른 배우의 이름·번호와 칸별 인원은 담지 않고 내가 옮길 수 있는 빈 칸만 보여 준다.
 * {@code changeDeadline}은 지금 시간에서 직접 변경 마감 시간만큼 앞선 시각이다.
 */
public record ActorTimetableResult(
        String title,
        String organizerName,
        String location,
        String guide,
        String actorName,
        TimeSlotResult slot,
        SelfChangeStatus selfChange,
        Instant changeDeadline,
        long selfChangeNoticeHours,
        List<TimeSlotResult> openSlots,
        Request request
) {

    /** 기획사에게 보낸 시간 조정 요청 중 아직 처리되지 않은 것. */
    public record Request(String message, Instant createdAt) {
    }
}
