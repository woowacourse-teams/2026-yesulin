package art.yesulin.dormant.application.submission;

import static art.yesulin.dormant.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.dormant.domain.submission.SubmissionCareer;
import art.yesulin.global.exception.BusinessException;

public record SubmitCareerCommand(int year, int month, String title, String roleName) {

    SubmissionCareer toCareer() {
        if (month < 1 || month > 12) {
            throw new BusinessException(
                    INVALID_SUBMISSION,
                    "경력 월은 1~12여야 합니다.");
        }
        return new SubmissionCareer(year, month, title, roleName);
    }
}
