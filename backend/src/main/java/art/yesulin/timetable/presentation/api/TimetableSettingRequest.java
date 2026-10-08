package art.yesulin.timetable.presentation.api;

import art.yesulin.timetable.application.TimetableSettingCommand;
import art.yesulin.timetable.domain.setting.TimetableWindows;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record TimetableSettingRequest(
        @Min(5) @Max(240) int slotMinutes,
        @Min(1) @Max(50) int slotCapacity,
        @NotNull @Size(min = 1, max = TimetableWindows.MAX_SIZE) List<@Valid @NotNull TimetableWindowRequest> windows
) {

    public TimetableSettingCommand toCommand() {
        return new TimetableSettingCommand(slotMinutes, slotCapacity, windows.stream()
                .map(TimetableWindowRequest::toCommand)
                .toList());
    }
}
