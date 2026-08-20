package art.yesulin.application.audition.role;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_ROLE_SECTION;
import static art.yesulin.domain.audition.AuditionErrorCode.NOT_FOUND;
import static art.yesulin.domain.audition.AuditionErrorCode.ROLE_SECTION_NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.role.AuditionRoleSection;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.role.AuditionRoleSelections;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.performance.PerformanceRole;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditionRoleService {

    private final AuditionRepository auditionRepository;
    private final AuditionRoleSectionRepository roleSectionRepository;
    private final PerformanceRepository performanceRepository;

    @Transactional
    public AuditionRolesResult save(long ownerId, long auditionId, SaveAuditionRolesCommand command) {
        Audition audition = getAudition(ownerId, auditionId);
        Performance performance = getPerformance(ownerId, audition.getPerformanceId());
        AuditionRoleSelections selections = command.toSelections();
        ensureRolesBelongToPerformance(performance, selections);
        AuditionRoleSection roleSection = getOrCreateRoleSection(auditionId, selections);
        return AuditionRolesResult.from(roleSectionRepository.save(roleSection), performance);
    }

    @Transactional(readOnly = true)
    public AuditionRolesResult find(long ownerId, long auditionId) {
        Audition audition = getAudition(ownerId, auditionId);
        Performance performance = getPerformance(ownerId, audition.getPerformanceId());
        AuditionRoleSection roleSection = roleSectionRepository.findByAuditionId(auditionId)
                .orElseThrow(() -> new BusinessException(ROLE_SECTION_NOT_FOUND, "공고 배역 정보를 찾을 수 없습니다."));
        return AuditionRolesResult.from(roleSection, performance);
    }

    private AuditionRoleSection getOrCreateRoleSection(long auditionId, AuditionRoleSelections selections) {
        return roleSectionRepository.findByAuditionId(auditionId)
                .map(roleSection -> roleSection.replace(selections))
                .orElseGet(() -> new AuditionRoleSection(auditionId, selections));
    }

    private Audition getAudition(long ownerId, long auditionId) {
        return auditionRepository.findByIdAndOwnerId(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
    }

    private Performance getPerformance(long ownerId, long performanceId) {
        return performanceRepository.findByIdAndOwnerId(performanceId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고가 속한 공연을 찾을 수 없습니다."));
    }

    private void ensureRolesBelongToPerformance(Performance performance, AuditionRoleSelections selections) {
        Set<Long> performanceRoleIds = performance.getRoles().stream()
                .map(PerformanceRole::getId)
                .collect(Collectors.toSet());
        if (!performanceRoleIds.containsAll(selections.performanceRoleIds())) {
            throw new BusinessException(INVALID_ROLE_SECTION, "공연에서 선택한 배역을 찾을 수 없습니다.");
        }
    }

}
