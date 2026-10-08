package art.yesulin.timetable.application;

import art.yesulin.timetable.domain.setting.TimetableWindow;
import java.time.LocalDate;
import java.time.LocalTime;

public record TimetableWindowCommand(LocalDate date, LocalTime startTime, LocalTime endTime) {

    public TimetableWindow toWindow() {
        return new TimetableWindow(date, startTime, endTime);
    }
}
