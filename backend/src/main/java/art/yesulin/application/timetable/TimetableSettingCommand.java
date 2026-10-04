package art.yesulin.application.timetable;

import art.yesulin.domain.timetable.setting.TimetableSetting;
import java.util.List;

public record TimetableSettingCommand(int slotMinutes, int slotCapacity, List<TimetableWindowCommand> windows) {

    public TimetableSetting toSetting() {
        return new TimetableSetting(slotMinutes, slotCapacity, windows.stream()
                .map(TimetableWindowCommand::toWindow)
                .toList());
    }
}
