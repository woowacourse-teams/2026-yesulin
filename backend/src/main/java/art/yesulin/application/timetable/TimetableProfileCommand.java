package art.yesulin.application.timetable;

import art.yesulin.domain.timetable.TimetableProfile;

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
