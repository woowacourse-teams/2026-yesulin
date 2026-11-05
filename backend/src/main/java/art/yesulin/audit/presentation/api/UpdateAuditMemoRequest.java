package art.yesulin.audit.presentation.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateAuditMemoRequest(@NotNull @Size(max = 500) String memo) {
}
