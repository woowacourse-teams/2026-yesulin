package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;

public record VideoResponse(long videoRequirementId, String requirementDescription, String url) {

    public static final int MAX_DESCRIPTION_LENGTH = 255;

    public VideoResponse {
        videoRequirementId = requirePositive(videoRequirementId, "영상 요구사항 ID는 1 이상이어야 합니다.");
        requirementDescription = requireText(requirementDescription, "영상 요구사항 문구는 필수입니다.");
        if (requirementDescription.length() > MAX_DESCRIPTION_LENGTH) {
            throw new BusinessException(INVALID_SUBMISSION, "영상 요구사항 문구는 255자를 넘을 수 없습니다.");
        }
        url = requireText(url, "제출 영상 URL은 필수입니다.");
    }
}
