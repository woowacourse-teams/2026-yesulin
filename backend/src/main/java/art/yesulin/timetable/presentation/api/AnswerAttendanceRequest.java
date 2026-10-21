package art.yesulin.timetable.presentation.api;

import art.yesulin.timetable.domain.actor.TimetableAttendance;
import jakarta.validation.constraints.NotNull;

public record AnswerAttendanceRequest(@NotNull TimetableAttendance attendance) {
}
