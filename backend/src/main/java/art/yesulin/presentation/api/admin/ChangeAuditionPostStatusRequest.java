package art.yesulin.presentation.api.admin;

import art.yesulin.domain.auditionpost.AuditionPostStatus;
import jakarta.validation.constraints.NotNull;

public record ChangeAuditionPostStatusRequest(@NotNull AuditionPostStatus status) {
}
