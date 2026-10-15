package art.yesulin.company.presentation.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * 공연사 사진을 올릴 자리를 만든다. 화면이 사진을 줄인 뒤의 형식과 크기다.
 *
 * @param contentType {@code image/jpeg}, {@code image/png}, {@code image/webp}
 */
public record PrepareCompanyPhotoUploadRequest(
        @NotBlank @Size(max = 100) String contentType,
        @Positive long size
) {
}
