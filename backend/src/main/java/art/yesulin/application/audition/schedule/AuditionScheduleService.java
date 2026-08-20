package art.yesulin.application.audition.schedule;

import static art.yesulin.domain.audition.AuditionErrorCode.NOT_FOUND;
import static art.yesulin.domain.audition.AuditionErrorCode.SCHEDULE_NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.schedule.AuditionSchedule;
import art.yesulin.domain.audition.schedule.AuditionSchedulePlan;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditionScheduleService {

    private final AuditionRepository auditionRepository;
    private final AuditionScheduleRepository scheduleRepository;

    @Transactional
    public AuditionScheduleResult save(long ownerId, long auditionId, SaveAuditionScheduleCommand command) {
        ensureOwnedAudition(ownerId, auditionId);
        AuditionSchedulePlan plan = command.toPlan();
        AuditionSchedule schedule = scheduleRepository.findByAuditionId(auditionId)
                .map(existingSchedule -> existingSchedule.replace(plan))
                .orElseGet(() -> new AuditionSchedule(auditionId, plan));
        return AuditionScheduleResult.from(scheduleRepository.save(schedule));
    }

    @Transactional(readOnly = true)
    public AuditionScheduleResult find(long ownerId, long auditionId) {
        ensureOwnedAudition(ownerId, auditionId);
        AuditionSchedule schedule = scheduleRepository.findByAuditionId(auditionId)
                .orElseThrow(() -> new BusinessException(SCHEDULE_NOT_FOUND, "공고 일정을 찾을 수 없습니다."));
        return AuditionScheduleResult.from(schedule);
    }

    private void ensureOwnedAudition(long ownerId, long auditionId) {
        auditionRepository.findByIdAndOwnerId(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
    }
}
