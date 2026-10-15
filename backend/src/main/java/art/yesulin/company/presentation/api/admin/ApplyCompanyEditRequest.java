package art.yesulin.company.presentation.api.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

/**
 * 운영자가 수정 요청을 보고 다듬은 공연사 정보.
 *
 * @param useRequestedPhoto 요청과 함께 온 사진을 대표 사진으로 쓸지. false면 {@code company.photoUrl}을 운영자 편집과 같이 쓴다.
 * @param companyUpdatedAt 운영자가 본 공연사 정보의 {@code updatedAt}. 그 사이 바뀌었으면 {@code 409 COMPANY_CHANGED}다.
 */
public record ApplyCompanyEditRequest(
        @Valid @NotNull WriteCompanyRequest company,
        boolean useRequestedPhoto,
        @NotNull Instant companyUpdatedAt
) {
}
