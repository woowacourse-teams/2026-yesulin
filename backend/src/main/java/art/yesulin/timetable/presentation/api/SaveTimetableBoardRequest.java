package art.yesulin.timetable.presentation.api;

import art.yesulin.timetable.application.SaveTimetableBoardCommand;
import art.yesulin.timetable.application.TimetableService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SaveTimetableBoardRequest(
        @Valid @NotNull TimetableSettingRequest setting,
        @NotNull @Size(max = TimetableService.MAX_ACTORS) List<@Valid @NotNull SlotAssignmentRequest> assignments
) {

    SaveTimetableBoardCommand toCommand() {
        return new SaveTimetableBoardCommand(setting.toCommand(), assignments.stream()
                .map(SlotAssignmentRequest::toAssignment)
                .toList());
    }
}
