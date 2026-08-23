package art.yesulin.application.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.submission.SubmissionErrorCode.RECRUITMENT_CLOSED;

import art.yesulin.common.exception.BusinessException;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
class RecruitmentPeriodValidator {

    void validate(SubmissionAudition audition, Instant submittedAt) {
        Instant validSubmittedAt = requireNonNull(submittedAt, "지원서 제출 시각은 필수입니다.");
        if (validSubmittedAt.isBefore(audition.recruitmentStartAt())
                || !validSubmittedAt.isBefore(audition.recruitmentEndAt())) {
            throw new BusinessException(RECRUITMENT_CLOSED, "현재 지원서를 제출할 수 없는 공고입니다.");
        }
    }
}
