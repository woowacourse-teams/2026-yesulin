package art.yesulin.timetable.application;

import art.yesulin.timetable.domain.actor.SlotAssignment;
import java.util.List;

/** 보드 저장. 시간대 설정은 통째로 바꾸고, 배정은 기획사가 실제로 옮긴 배우만 보낸다. */
public record SaveTimetableBoardCommand(TimetableSettingCommand setting, List<SlotAssignment> assignments) {
}
