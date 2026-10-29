package art.yesulin.actor.presentation.api.photolibrary;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * 배우 페이지 공개 사본을 올릴 자리를 만든다. 화면이 보관함 원본을 줄인 뒤의 형식과 크기다.
 *
 * @param contentType {@code image/jpeg}
 */
public record PreparePhotoPublicCopyUploadRequest(
        @NotBlank @Size(max = 100) String contentType,
        @Positive long size
) {
}
