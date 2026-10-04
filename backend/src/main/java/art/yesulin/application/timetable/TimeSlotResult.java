package art.yesulin.application.timetable;

import art.yesulin.domain.timetable.Timetable;
import art.yesulin.domain.timetable.setting.TimeSlot;
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
