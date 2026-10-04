package art.yesulin.presentation.api.timetable;

import art.yesulin.application.timetable.SaveTimetableBoardCommand;
import art.yesulin.application.timetable.TimetableService;
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
