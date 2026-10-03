package art.yesulin.application.timetable;

import art.yesulin.domain.timetable.TimetableSetting;
import java.util.List;

public record TimetableSettingCommand(int slotMinutes, int slotCapacity, List<TimetableWindowCommand> windows) {

    TimetableSetting toSetting() {
        return new TimetableSetting(slotMinutes, slotCapacity, windows.stream()
                .map(TimetableWindowCommand::toWindow)
                .toList());
    }
}
