package art.yesulin.audit.presentation.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RenameAuditApplicantRequest(
        @NotNull @Size(max = 255) String title
) {
}
