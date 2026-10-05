package art.yesulin.presentation.api.timetable;

import art.yesulin.application.timetable.CreateTimetableCommand;
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
