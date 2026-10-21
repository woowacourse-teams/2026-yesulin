package art.yesulin.event.presentation.api.admin;

import art.yesulin.event.domain.EventStatus;
import jakarta.validation.constraints.NotNull;

public record ChangeEventStatusRequest(@NotNull EventStatus status) {
}
