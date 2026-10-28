package art.yesulin.actor.presentation.api.profileimport;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 결과의 사진 후보에 있던 저장소 키. */
public record AddImportedPhotoRequest(@NotBlank @Size(max = 500) String fileKey) {
}
