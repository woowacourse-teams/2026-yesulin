package art.yesulin.application.timetable;

import art.yesulin.domain.timetable.TimetableWindow;
import java.time.LocalDate;
import java.time.LocalTime;

public record TimetableWindowCommand(LocalDate date, LocalTime startTime, LocalTime endTime) {

    TimetableWindow toWindow() {
        return new TimetableWindow(date, startTime, endTime);
    }
}
