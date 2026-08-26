package art.yesulin.application.audition.schedule;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_SCHEDULE;
import static art.yesulin.domain.audition.AuditionErrorCode.NOT_FOUND;
import static art.yesulin.domain.audition.AuditionErrorCode.SCHEDULE_NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.schedule.AuditionSchedule;
import art.yesulin.domain.audition.schedule.AuditionSchedulePlan;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.audition.schedule.ScreeningStage;
import art.yesulin.domain.audition.schedule.ScreeningStagePlan;
import art.yesulin.domain.screening.ScreeningReviewRepository;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditionScheduleService {

    private final AuditionRepository auditionRepository;
    private final AuditionScheduleRepository scheduleRepository;
    private final ScreeningReviewRepository screeningReviewRepository;

    @Transactional
    public AuditionScheduleResult save(long ownerId, UUID auditionId, SaveAuditionScheduleCommand command) {
        Audition audition = getOwnedAuditionForUpdate(ownerId, auditionId);
        AuditionSchedulePlan plan = command.toPlan();
        plan.ensureWithinPerformanceEnd(audition.getPerformanceEndDate());
        AuditionSchedule schedule = scheduleRepository.findByAuditionId(audition.getId())
                .map(existingSchedule -> replace(existingSchedule, plan))
                .orElseGet(() -> new AuditionSchedule(audition.getId(), plan));
        return AuditionScheduleResult.from(auditionId, scheduleRepository.save(schedule));
    }

    private AuditionSchedule replace(AuditionSchedule schedule, AuditionSchedulePlan plan) {
        ensureRemovedStagesUnreviewed(schedule, plan);
        return schedule.replace(plan);
    }

    /** 저장 목록에서 빠진 전형은 삭제된다. 심사 기록이 달린 전형은 지우지 않고 먼저 막는다. */
    private void ensureRemovedStagesUnreviewed(AuditionSchedule schedule, AuditionSchedulePlan plan) {
        Set<Long> keptStageIds = plan.stages().values().stream()
                .map(ScreeningStagePlan::stageId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        List<Long> removedStageIds = schedule.getStages().stream()
                .map(ScreeningStage::getId)
                .filter(stageId -> !keptStageIds.contains(stageId))
                .toList();
        if (!removedStageIds.isEmpty() && screeningReviewRepository.existsByScreeningStageIdIn(removedStageIds)) {
            throw new BusinessException(INVALID_SCHEDULE, "이미 심사를 시작한 전형은 삭제할 수 없습니다.");
        }
    }

    @Transactional(readOnly = true)
    public AuditionScheduleResult find(long ownerId, UUID auditionId) {
        Audition audition = getOwnedAudition(ownerId, auditionId);
        AuditionSchedule schedule = scheduleRepository.findByAuditionId(audition.getId())
                .orElseThrow(() -> new BusinessException(SCHEDULE_NOT_FOUND, "공고 일정을 찾을 수 없습니다."));
        return AuditionScheduleResult.from(auditionId, schedule);
    }

    private Audition getOwnedAudition(long ownerId, UUID auditionId) {
        return auditionRepository.findByPublicIdAndOwnerId(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
    }

    private Audition getOwnedAuditionForUpdate(long ownerId, UUID auditionId) {
        return auditionRepository.findByPublicIdAndOwnerIdForUpdate(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
    }
}
