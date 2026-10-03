package art.yesulin.presentation.api.timetable;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/** {@code current}는 배우 화면이 본 지금 시간이다. 그사이 기획사가 옮겼다면 거절한다. */
public record ChangeActorSlotRequest(
        @Valid @NotNull TimeSlotRequest current,
        @Valid @NotNull TimeSlotRequest next
) {
}
