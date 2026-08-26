package art.yesulin.domain.audition.schedule;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import java.time.LocalDate;

public record AuditionSchedulePlan(RecruitmentPeriod recruitmentPeriod, ScreeningStagePlans stages) {

    public AuditionSchedulePlan {
        recruitmentPeriod = requireNonNull(recruitmentPeriod, "모집 기간은 필수입니다.");
        stages = requireNonNull(stages, "전형 정보는 필수입니다.");
        AuditionScheduleDatePolicy.validateStagesAfterRecruitment(
                recruitmentPeriod,
                stages.values().stream().map(ScreeningStagePlan::date).toList()
        );
    }

    public void ensureWithinPerformanceEnd(LocalDate performanceEndDate) {
        AuditionScheduleDatePolicy.validateStagesWithinPerformance(
                performanceEndDate,
                stages.values().stream().map(ScreeningStagePlan::date).toList()
        );
    }
}
