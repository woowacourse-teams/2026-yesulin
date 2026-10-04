package art.yesulin.presentation.api.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ImportOtrAuditionPostRequest(
        @NotBlank @Pattern(regexp = "\\s*[0-9]{1,30}\\s*", message = "OTR 공고 번호는 숫자 1~30자로 입력해 주세요.")
        String otrId
) {
}
