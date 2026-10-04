package art.yesulin.presentation.api.timetable;

import art.yesulin.domain.timetable.setting.TimeSlot;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;

public record TimeSlotRequest(@NotNull LocalDate date, @NotNull LocalTime startTime) {

    static TimeSlot toSlot(TimeSlotRequest request) {
        return request == null ? null : new TimeSlot(request.date(), request.startTime());
    }
}
