package art.yesulin.timetable.domain.actor;

import art.yesulin.timetable.domain.setting.TimeSlot;

/**
 * 기획사가 보드에서 배우 한 명을 옮긴 기록이다. {@code previous}는 기획사 화면이 본 시간이며,
 * 그사이 배우가 직접 바꿔 지금 시간과 다르면 덮어쓰지 않고 거절한다. 두 값 모두 null이면 미배정이다.
 */
public record SlotAssignment(long actorId, TimeSlot previous, TimeSlot next) {
}
