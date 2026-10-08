package art.yesulin.timetable.application.admin;

import java.util.List;

/** {@code pendingCount}는 화면 목록 상한과 관계없는 전체 대기 건수다. */
public record AdminTimetableMessagesResult(long pendingCount, List<AdminTimetableMessageResult> messages) {
}
