package art.yesulin.pdfextraction.presentation.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PreparePdfUploadRequest(
        @NotBlank @Size(max = 255) String originalFilename,
        @Min(1) @Max(26214400) long size
) {
}
