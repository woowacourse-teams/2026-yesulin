package art.yesulin.pdfreview.presentation.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreatePdfReviewRequest(
        @NotBlank @Size(max = 500) String title,
        @NotEmpty @Size(max = 50) List<@NotBlank @Size(max = 500) String> roles
) {
}
