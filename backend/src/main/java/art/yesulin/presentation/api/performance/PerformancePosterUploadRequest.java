package art.yesulin.presentation.api.performance;

import art.yesulin.application.file.FileUploadCommand;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record PerformancePosterUploadRequest(
        @NotBlank @Size(max = 255) String originalFilename,
        @NotBlank @Pattern(regexp = "image/(jpeg|png|webp)") String contentType,
        @Positive @Max(value = 30 * 1024 * 1024) long size
) {

    public FileUploadCommand toCommand() {
        return new FileUploadCommand(originalFilename, contentType, size);
    }
}
