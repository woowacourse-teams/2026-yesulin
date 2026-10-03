package art.yesulin.application.timetable;

/** 관리 링크 열쇠는 만들 때 한 번만 응답으로 준다. 이후에는 열쇠를 아는 사람만 일정표를 연다. */
public record TimetableCreatedResult(String manageKey, TimetableBoardResult timetable) {
}
