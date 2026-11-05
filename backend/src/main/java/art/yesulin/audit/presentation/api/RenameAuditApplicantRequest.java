package art.yesulin.audit.presentation.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenameAuditApplicantRequest(
        @NotBlank @Size(max = 255) String title
) {
}
