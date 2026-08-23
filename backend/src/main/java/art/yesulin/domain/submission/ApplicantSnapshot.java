package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;
import lombok.EqualsAndHashCode;
import lombok.Getter;

@Getter
@EqualsAndHashCode
public class ApplicantSnapshot {

    private static final ZoneId AGE_CALCULATION_ZONE = ZoneId.of("Asia/Seoul");

    private final SubmissionBasicInformation basicInformation;
    private final SubmissionAdditionalInformation additionalInformation;
    private final Integer ageAtRecruitmentDeadline;

    public ApplicantSnapshot(
            SubmissionBasicInformation basicInformation,
            SubmissionAdditionalInformation additionalInformation,
            Instant submittedAt,
            Instant recruitmentEndAt
    ) {
        this.basicInformation = requireNonNull(basicInformation, "제출 기본 정보는 필수입니다.");
        this.additionalInformation = requireNonNull(additionalInformation, "제출 추가 정보는 필수입니다.");
        Instant safeSubmittedAt = requireNonNull(submittedAt, "지원서 제출 시각은 필수입니다.");
        Instant safeRecruitmentEndAt = requireNonNull(recruitmentEndAt, "모집 마감 시각은 필수입니다.");
        this.ageAtRecruitmentDeadline = calculateAge(
                basicInformation.birthDate(), safeSubmittedAt, safeRecruitmentEndAt
        );
    }

    private Integer calculateAge(LocalDate birthDate, Instant submittedAt, Instant recruitmentEndAt) {
        if (birthDate == null) {
            return null;
        }
        LocalDate submissionDate = submittedAt.atZone(AGE_CALCULATION_ZONE).toLocalDate();
        if (birthDate.isAfter(submissionDate)) {
            throw new BusinessException(INVALID_SUBMISSION, "생년월일은 제출일보다 미래일 수 없습니다.");
        }
        LocalDate recruitmentDeadline = recruitmentEndAt.atZone(AGE_CALCULATION_ZONE).toLocalDate();
        return Period.between(birthDate, recruitmentDeadline).getYears();
    }
}
