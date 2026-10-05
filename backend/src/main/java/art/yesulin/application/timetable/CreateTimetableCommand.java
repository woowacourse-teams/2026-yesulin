package art.yesulin.application.timetable;

import art.yesulin.domain.timetable.Timetable;

public record CreateTimetableCommand(TimetableProfileCommand profile, TimetableSettingCommand setting) {

    public Timetable toTimetable() {
        return new Timetable(profile.toProfile(), setting.toSetting());
    }
}
