package art.yesulin.timetable.presentation.api;

import art.yesulin.timetable.application.TimetableProfileCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record TimetableProfileRequest(
        @NotBlank @Size(max = 60) String title,
        @NotBlank @Size(max = 40) String organizerName,
        @Size(max = 30) String contactName,
        @NotBlank @Pattern(regexp = TimetableRequests.PHONE_PATTERN, message = TimetableRequests.PHONE_MESSAGE)
        String organizerPhone,
        @Size(max = 200) String location,
        @Size(max = 1000) String guide
) {

    public TimetableProfileCommand toCommand() {
        return new TimetableProfileCommand(title, organizerName, contactName, organizerPhone, location, guide);
    }
}
