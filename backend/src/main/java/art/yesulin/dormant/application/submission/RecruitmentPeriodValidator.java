package art.yesulin.dormant.application.submission;

import static art.yesulin.dormant.domain.submission.SubmissionErrorCode.RECRUITMENT_CLOSED;
import static art.yesulin.global.validation.DomainValidator.requireNonNull;

import art.yesulin.global.exception.BusinessException;
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
