package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;

public record PhotoResponse(long photoRequirementId, String requirementDescription, long fileId) {

    public static final int MAX_DESCRIPTION_LENGTH = 255;

    public PhotoResponse {
        photoRequirementId = requirePositive(photoRequirementId, "사진 요구사항 ID는 1 이상이어야 합니다.");
        requirementDescription = requireText(requirementDescription, "사진 요구사항 문구는 필수입니다.");
        if (requirementDescription.length() > MAX_DESCRIPTION_LENGTH) {
            throw new BusinessException(INVALID_SUBMISSION, "사진 요구사항 문구는 255자를 넘을 수 없습니다.");
        }
        fileId = requirePositive(fileId, "사진 파일 ID는 1 이상이어야 합니다.");
    }
}
