package art.yesulin.auditionpost.presentation.api.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * 원문 작성자를 기획사에 자동 연결한다.
 *
 * @param source 원문 출처(예: {@code OTR})
 * @param sourceAuthorId 원문 작성자 회원 번호
 */
public record LinkAuditionPostAuthorRequest(
        @NotBlank String source,
        @NotBlank String sourceAuthorId,
        @NotNull @Positive Long ownerId
) {
}
