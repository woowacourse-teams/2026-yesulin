package art.yesulin.timetable.presentation.api;

import art.yesulin.timetable.application.ActorContactCommand;
import art.yesulin.timetable.application.TimetableService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record RegisterActorsRequest(
        @NotNull @Size(min = 1, max = TimetableService.MAX_ACTORS) List<@Valid @NotNull ActorContactRequest> actors
) {

    List<ActorContactCommand> toCommands() {
        return actors.stream().map(ActorContactRequest::toCommand).toList();
    }
}
