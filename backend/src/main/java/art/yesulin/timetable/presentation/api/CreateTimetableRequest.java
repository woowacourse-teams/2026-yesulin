package art.yesulin.timetable.presentation.api;

import art.yesulin.timetable.application.CreateTimetableCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record CreateTimetableRequest(
        @Valid @NotNull TimetableProfileRequest profile,
        @Valid @NotNull TimetableSettingRequest setting
) {

    CreateTimetableCommand toCommand() {
        return new CreateTimetableCommand(profile.toCommand(), setting.toCommand());
    }
}
