package art.yesulin.application.audition.schedule;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import art.yesulin.domain.audition.schedule.AuditionSchedulePlan;
import art.yesulin.domain.audition.schedule.RecruitmentPeriod;
import art.yesulin.domain.audition.schedule.ScreeningStagePlans;
import java.time.Instant;
import java.util.List;

public record SaveAuditionScheduleCommand(
        Instant recruitmentStartAt,
        Instant recruitmentEndAt,
        List<SaveScreeningStageCommand> stages
) {

    public SaveAuditionScheduleCommand {
        stages = List.copyOf(requireNonNull(stages, "전형 정보는 필수입니다."));
    }

    public AuditionSchedulePlan toPlan() {
        ScreeningStagePlans stagePlans = new ScreeningStagePlans(stages.stream()
                .map(SaveScreeningStageCommand::toPlan)
                .toList());
        return new AuditionSchedulePlan(new RecruitmentPeriod(recruitmentStartAt, recruitmentEndAt), stagePlans);
    }
}
