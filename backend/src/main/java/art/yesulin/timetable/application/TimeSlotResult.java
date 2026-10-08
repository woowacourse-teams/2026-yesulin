package art.yesulin.timetable.application;

import art.yesulin.timetable.domain.Timetable;
import art.yesulin.timetable.domain.setting.TimeSlot;
import java.time.LocalDate;
import java.time.LocalTime;

public record TimeSlotResult(LocalDate date, LocalTime startTime, LocalTime endTime) {

    static TimeSlotResult of(TimeSlot slot, Timetable timetable) {
        if (slot == null) {
            return null;
        }
        return new TimeSlotResult(slot.date(), slot.startTime(), timetable.endTimeOf(slot));
    }
}
