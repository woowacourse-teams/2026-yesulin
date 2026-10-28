package art.yesulin.actor.presentation.api.profileimport;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** 올릴 PDF의 이름과 크기. PDF·25MiB 이하인지는 추출 작업이 다시 확인한다. */
public record PrepareProfileImportRequest(
        @NotBlank @Size(max = 255) String originalFilename,
        @Positive long size
) {
}
