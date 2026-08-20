package art.yesulin.domain.audition.schedule;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

public record AuditionSchedulePlan(RecruitmentPeriod recruitmentPeriod, ScreeningStagePlans stages) {

    public AuditionSchedulePlan {
        recruitmentPeriod = requireNonNull(recruitmentPeriod, "모집 기간은 필수입니다.");
        stages = requireNonNull(stages, "전형 정보는 필수입니다.");
    }
}
