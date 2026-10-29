package art.yesulin.audit.presentation.api;

import art.yesulin.audit.domain.AuditDecision;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateAuditApplicantRequest(
        @NotNull @Size(max = 2000) String memo,
        @NotNull AuditDecision decision
) {
}
