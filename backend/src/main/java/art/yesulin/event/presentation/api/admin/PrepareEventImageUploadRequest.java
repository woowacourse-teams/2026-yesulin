package art.yesulin.event.presentation.api.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * 이벤트 이미지를 올릴 자리를 만든다.
 *
 * @param contentType {@code image/jpeg}, {@code image/png}, {@code image/webp}
 */
public record PrepareEventImageUploadRequest(
        @NotBlank @Size(max = 100) String contentType,
        @Positive long size
) {
}
