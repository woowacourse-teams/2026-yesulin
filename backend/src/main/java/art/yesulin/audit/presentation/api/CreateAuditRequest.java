package art.yesulin.audit.presentation.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateAuditRequest(
        @NotBlank @Size(max = 500) String title,
        @NotNull @Size(max = 50) List<@NotBlank @Size(max = 500) String> roles
) {
}
