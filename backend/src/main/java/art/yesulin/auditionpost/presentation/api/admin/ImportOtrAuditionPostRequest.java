package art.yesulin.auditionpost.presentation.api.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * 운영자가 번호로 OTR 공고를 가져오는 요청.
 *
 * @param overwriteEdited 운영자가 고친 공고를 원문으로 덮어써도 되는지. 생략할 수 있게 wrapper로 받고 없으면 false로 본다.
 */
public record ImportOtrAuditionPostRequest(
        @NotBlank @Pattern(regexp = "\\s*[0-9]{1,30}\\s*", message = "OTR 공고 번호는 숫자 1~30자로 입력해 주세요.")
        String otrId,
        Boolean overwriteEdited
) {

    public boolean shouldOverwriteEdited() {
        return Boolean.TRUE.equals(overwriteEdited);
    }
}
