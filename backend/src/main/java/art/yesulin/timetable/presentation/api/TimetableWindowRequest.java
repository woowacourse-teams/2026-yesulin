package art.yesulin.timetable.presentation.api;

import art.yesulin.timetable.application.TimetableWindowCommand;
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
