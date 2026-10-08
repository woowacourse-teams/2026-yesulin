package art.yesulin.auditionpost.presentation.api.admin;

import art.yesulin.auditionpost.domain.AuditionPostStatus;
import jakarta.validation.constraints.NotNull;

public record ChangeAuditionPostStatusRequest(@NotNull AuditionPostStatus status) {
}
