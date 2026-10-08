package art.yesulin.timetable.application;

import art.yesulin.timetable.domain.TimetableProfile;

public record TimetableProfileCommand(
        String title,
        String organizerName,
        String organizerPhone,
        String location,
        String guide
) {

    public TimetableProfile toProfile() {
        return new TimetableProfile(title, organizerName, organizerPhone, location, guide);
    }
}
