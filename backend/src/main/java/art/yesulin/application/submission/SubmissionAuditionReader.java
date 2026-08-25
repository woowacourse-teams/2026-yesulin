package art.yesulin.application.submission;

import static art.yesulin.domain.audition.AuditionErrorCode.NOT_FOUND;

import art.yesulin.application.submission.form.SubmissionFormDefinition;
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
import art.yesulin.domain.performance.PerformanceRole;
import art.yesulin.domain.producer.Producer;
import art.yesulin.domain.producer.ProducerRepository;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class SubmissionAuditionReader {

    private final AuditionRepository auditionRepository;
    private final PerformanceRepository performanceRepository;
    private final ProducerRepository producerRepository;
    private final AuditionRoleSectionRepository roleSectionRepository;
    private final AuditionScheduleRepository scheduleRepository;
    private final AuditionFormRepository formRepository;

    SubmissionAudition read(UUID auditionId) {
        Audition audition = auditionRepository.findByPublicId(auditionId)
                .filter(Audition::isPublished)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
        Performance performance = performanceRepository.findById(audition.getPerformanceId())
                .orElseThrow(() -> new IllegalStateException("공고가 속한 공연을 찾을 수 없습니다."));
        Producer producer = producerRepository.findByMemberId(performance.getOwnerId())
                .orElseThrow(() -> new IllegalStateException("공고를 등록한 기획사·제작사를 찾을 수 없습니다."));
        long internalAuditionId = audition.getId();
        AuditionRoleSection roleSection = roleSectionRepository.findByAuditionId(internalAuditionId)
                .orElseThrow(() -> new IllegalStateException("게시된 공고의 배역 정보를 찾을 수 없습니다."));
        AuditionSchedule schedule = scheduleRepository.findByAuditionId(internalAuditionId)
                .orElseThrow(() -> new IllegalStateException("게시된 공고의 일정 정보를 찾을 수 없습니다."));
        AuditionForm form = formRepository.findByAuditionId(internalAuditionId)
                .orElseThrow(() -> new IllegalStateException("게시된 공고의 지원 폼을 찾을 수 없습니다."));
        return toSubmissionAudition(audition, performance, producer, roleSection, schedule, form);
    }

    private SubmissionAudition toSubmissionAudition(
            Audition audition,
            Performance performance,
            Producer producer,
            AuditionRoleSection roleSection,
            AuditionSchedule schedule,
            AuditionForm form
    ) {
        Map<Long, PerformanceRole> performanceRoles = performance.getRoles().stream()
                .collect(Collectors.toMap(PerformanceRole::getId, Function.identity()));
        return new SubmissionAudition(
                audition.getId(),
                audition.getPublicId(),
                audition.getTitle(),
                performance.getTitle(),
                producer.getCompanyName(),
                performance.getPosterFileId(),
                performance.getOwnerId(),
                schedule.getRecruitmentPeriod().getStartAt(),
                schedule.getRecruitmentPeriod().getEndAt(),
                roleSection.isMultipleRoleApplicationsAllowed(),
                roleSection.getRoles().stream()
                        .map(role -> new SubmissionAuditionRole(
                                role.getId(),
                                findPerformanceRole(performanceRoles, role.getPerformanceRoleId()).getName()
                        ))
                        .toList(),
                SubmissionFormDefinition.from(form)
        );
    }

    private PerformanceRole findPerformanceRole(Map<Long, PerformanceRole> performanceRoles, long roleId) {
        PerformanceRole role = performanceRoles.get(roleId);
        if (role == null) {
            throw new IllegalStateException("공고 배역에 연결된 공연 배역을 찾을 수 없습니다.");
        }
        return role;
    }

}
