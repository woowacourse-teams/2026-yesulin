package art.yesulin.audit.presentation.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PrepareAuditUploadRequest(
        @NotBlank @Size(max = 255) String originalFilename,
        @Min(1) @Max(26214400) long size,
        @NotBlank @Pattern(regexp = "[0-9a-f]{64}") String sha256
) {
}
