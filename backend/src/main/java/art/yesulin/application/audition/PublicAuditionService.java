package art.yesulin.application.audition;

import static art.yesulin.domain.audition.AuditionErrorCode.NOT_FOUND;

import art.yesulin.application.audition.form.AuditionFormResult;
import art.yesulin.application.audition.role.AuditionRolesResult;
import art.yesulin.application.audition.schedule.AuditionScheduleResult;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.form.AuditionForm;
import art.yesulin.domain.audition.form.AuditionFormRepository;
import art.yesulin.domain.audition.role.AuditionRoleSection;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.schedule.AuditionSchedule;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PublicAuditionService {

    private final AuditionRepository auditionRepository;
    private final PerformanceRepository performanceRepository;
    private final AuditionRoleSectionRepository roleSectionRepository;
    private final AuditionScheduleRepository scheduleRepository;
    private final AuditionFormRepository formRepository;

    @Transactional(readOnly = true)
    public PublicAuditionResult find(UUID auditionId) {
        Audition audition = auditionRepository.findByPublicId(auditionId)
                .filter(Audition::isPublished)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
        Performance performance = performanceRepository.findById(audition.getPerformanceId())
                .orElseThrow(() -> new IllegalStateException("공고가 속한 공연을 찾을 수 없습니다."));
        long internalAuditionId = audition.getId();
        AuditionRoleSection roles = roleSectionRepository.findByAuditionId(internalAuditionId)
                .orElseThrow(() -> new IllegalStateException("게시된 공고의 배역 정보를 찾을 수 없습니다."));
        AuditionSchedule schedule = scheduleRepository.findByAuditionId(internalAuditionId)
                .orElseThrow(() -> new IllegalStateException("게시된 공고의 일정 정보를 찾을 수 없습니다."));
        AuditionForm form = formRepository.findByAuditionId(internalAuditionId)
                .orElseThrow(() -> new IllegalStateException("게시된 공고의 지원 폼을 찾을 수 없습니다."));
        return new PublicAuditionResult(
                audition.getOwnerId(),
                performance.getPosterFileId(),
                performance.getTitle(),
                performance.getRoadAddress(),
                AuditionResult.from(audition),
                AuditionRolesResult.from(auditionId, roles, performance),
                AuditionScheduleResult.from(auditionId, schedule),
                AuditionFormResult.from(auditionId, form)
        );
    }
}
