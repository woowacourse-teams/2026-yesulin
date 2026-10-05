package art.yesulin.presentation.api.timetable;

import art.yesulin.application.timetable.ActorContactCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ActorContactRequest(
        @NotBlank @Size(max = 30) String name,
        @NotBlank @Pattern(regexp = TimetableRequests.PHONE_PATTERN, message = TimetableRequests.PHONE_MESSAGE)
        String phone
) {

    ActorContactCommand toCommand() {
        return new ActorContactCommand(name, phone);
    }
}
