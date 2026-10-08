package art.yesulin.timetable.application;

import art.yesulin.timetable.domain.Timetable;

public record CreateTimetableCommand(TimetableProfileCommand profile, TimetableSettingCommand setting) {

    public Timetable toTimetable() {
        return new Timetable(profile.toProfile(), setting.toSetting());
    }
}
