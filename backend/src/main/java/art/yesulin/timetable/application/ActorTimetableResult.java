package art.yesulin.timetable.application;

import art.yesulin.timetable.domain.actor.TimetableAttendance;
import java.time.Instant;

/** 배우 개인 링크 화면. 다른 배우의 이름·번호와 칸별 인원은 담지 않는다. */
public record ActorTimetableResult(
        String title,
        String organizerName,
        String location,
        String guide,
        String actorName,
        TimeSlotResult slot,
        TimetableAttendance attendance,
        Request request
) {

    /** 기획사에게 보낸 시간 변경 문의 중 아직 처리되지 않은 것. */
    public record Request(String message, Instant createdAt) {
    }
}
