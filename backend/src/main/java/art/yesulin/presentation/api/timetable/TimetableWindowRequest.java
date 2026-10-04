package art.yesulin.presentation.api.timetable;

import art.yesulin.application.timetable.TimetableWindowCommand;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;

public record TimetableWindowRequest(
        @NotNull LocalDate date,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime
) {

    TimetableWindowCommand toCommand() {
        return new TimetableWindowCommand(date, startTime, endTime);
    }
}
