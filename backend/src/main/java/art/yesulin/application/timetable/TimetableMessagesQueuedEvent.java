package art.yesulin.application.timetable;

/** 보낼 문자가 대기열에 들어왔다는 신호. 받는 사람 이름·번호와 링크는 담지 않는다. */
public record TimetableMessagesQueuedEvent(long timetableId, String timetableTitle, int count) {
}
