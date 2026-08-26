package art.yesulin.application.audition.schedule;

import static art.yesulin.domain.audition.AuditionErrorCode.NOT_FOUND;
import static art.yesulin.domain.audition.AuditionErrorCode.SCHEDULE_NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.schedule.AuditionSchedule;
import art.yesulin.domain.audition.schedule.AuditionSchedulePlan;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditionScheduleService {

    private final AuditionRepository auditionRepository;
    private final AuditionScheduleRepository scheduleRepository;

    @Transactional
    public AuditionScheduleResult save(long ownerId, UUID auditionId, SaveAuditionScheduleCommand command) {
        Audition audition = getOwnedAuditionForUpdate(ownerId, auditionId);
        AuditionSchedulePlan plan = command.toPlan();
        plan.ensureWithinPerformanceEnd(audition.getPerformanceEndDate());
        AuditionSchedule schedule = scheduleRepository.findByAuditionId(audition.getId())
                .map(existingSchedule -> existingSchedule.replace(plan))
                .orElseGet(() -> new AuditionSchedule(audition.getId(), plan));
        return AuditionScheduleResult.from(auditionId, scheduleRepository.save(schedule));
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
