package art.yesulin.auditionpost.presentation.api;

import art.yesulin.auditionpost.domain.AuditionPostFileKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * 공고 사진·첨부를 올릴 자리를 요청한다. 형식은 서버가 정한다.
 *
 * @param contentType 브라우저가 알려 준 형식. 사진은 이 값을 먼저 보고, 첨부는 확장자로만 판단한다.
 */
public record PrepareAuditionPostUploadRequest(
        @NotNull AuditionPostFileKind kind,
        @NotBlank String filename,
        String contentType,
        @NotNull @Positive Long size
) {
}
