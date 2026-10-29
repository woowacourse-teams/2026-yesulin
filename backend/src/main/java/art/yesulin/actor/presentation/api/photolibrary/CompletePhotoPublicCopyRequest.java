package art.yesulin.actor.presentation.api.photolibrary;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 올린 공개 사본을 사진에 붙인다. {@code uploadKey}는 업로드를 준비할 때 받은 값이다. */
public record CompletePhotoPublicCopyRequest(
        @NotBlank @Size(max = 500) String uploadKey
) {
}
