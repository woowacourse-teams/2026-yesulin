package art.yesulin.application.audition.schedule;

import art.yesulin.domain.audition.schedule.AuditionSchedule;
import art.yesulin.domain.audition.schedule.RecruitmentPeriod;
import art.yesulin.domain.audition.schedule.ScreeningStage;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

public record AuditionScheduleResult(
        UUID auditionId,
        Instant recruitmentStartAt,
        Instant recruitmentEndAt,
        List<ScreeningStageResult> stages
) {

    public static AuditionScheduleResult from(UUID auditionId, AuditionSchedule schedule) {
        RecruitmentPeriod period = schedule.getRecruitmentPeriod();
        List<ScreeningStage> stages = schedule.getStages();
        List<ScreeningStageResult> stageResults = IntStream.range(0, stages.size())
                .mapToObj(index -> ScreeningStageResult.from(stages.get(index), index + 1))
                .toList();
        return new AuditionScheduleResult(
                auditionId, period.getStartAt(), period.getEndAt(), stageResults
        );
    }
}
