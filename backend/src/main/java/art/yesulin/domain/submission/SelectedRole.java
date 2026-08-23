package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;

public record SelectedRole(long auditionRoleId, String roleName) {

    public static final int MAX_ROLE_NAME_LENGTH = 100;

    public SelectedRole {
        auditionRoleId = requirePositive(auditionRoleId, "공고 배역 ID는 1 이상이어야 합니다.");
        roleName = requireText(roleName, "제출 배역명은 필수입니다.");
        if (roleName.length() > MAX_ROLE_NAME_LENGTH) {
            throw new BusinessException(INVALID_SUBMISSION, "제출 배역명은 100자를 넘을 수 없습니다.");
        }
    }
}
