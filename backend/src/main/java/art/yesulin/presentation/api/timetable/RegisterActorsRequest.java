package art.yesulin.presentation.api.timetable;

import art.yesulin.application.timetable.ActorContactCommand;
import art.yesulin.application.timetable.TimetableService;
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
