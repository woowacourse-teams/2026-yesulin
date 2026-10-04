package art.yesulin.presentation.api.timetable;

import art.yesulin.domain.timetable.actor.SlotAssignment;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;

/** {@code previous}·{@code next}가 null이면 미배정이다. */
public record SlotAssignmentRequest(
        @Positive long actorId,
        @Valid TimeSlotRequest previous,
        @Valid TimeSlotRequest next
) {

    SlotAssignment toAssignment() {
        return new SlotAssignment(actorId, TimeSlotRequest.toSlot(previous), TimeSlotRequest.toSlot(next));
    }
}
