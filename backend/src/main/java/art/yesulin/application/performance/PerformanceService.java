package art.yesulin.application.performance;

import static art.yesulin.domain.performance.PerformanceErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.performance.PerformanceRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PerformanceService {

    private final PerformanceRepository performanceRepository;

    @Transactional
    public PerformanceResult create(long ownerId, CreatePerformanceCommand command) {
        Performance performance = new Performance(
                ownerId, command.posterFileId(), command.title(), command.roadAddress()
        );
        command.roles().forEach(role -> performance.addRole(role.name(), role.description()));
        return PerformanceResult.from(performanceRepository.saveAndFlush(performance));
    }

    @Transactional
    public PerformanceResult updateBasicInformation(
            long ownerId,
            long performanceId,
            UpdatePerformanceBasicInformationCommand command
    ) {
        Performance performance = getPerformance(ownerId, performanceId);
        performance.updateBasicInformation(command.posterFileId(), command.title(), command.roadAddress());
        return PerformanceResult.from(performanceRepository.saveAndFlush(performance));
    }

    @Transactional
    public PerformanceRoleResult addRole(long ownerId, long performanceId, CreatePerformanceRoleCommand command) {
        Performance performance = getPerformance(ownerId, performanceId);
        PerformanceRole role = performance.addRole(command.name(), command.description());
        performanceRepository.flush();
        return PerformanceRoleResult.from(role);
    }

    @Transactional
    public PerformanceRoleResult updateRole(
            long ownerId,
            long performanceId,
            long roleId,
            UpdatePerformanceRoleCommand command
    ) {
        Performance performance = getPerformance(ownerId, performanceId);
        PerformanceRole role = performance.updateRole(roleId, command.name(), command.description());
        performanceRepository.flush();
        return PerformanceRoleResult.from(role);
    }

    @Transactional
    public void removeRole(long ownerId, long performanceId, long roleId) {
        Performance performance = getPerformance(ownerId, performanceId);
        performance.removeRole(roleId);
        performanceRepository.flush();
    }

    private Performance getPerformance(long ownerId, long performanceId) {
        return performanceRepository.findByIdAndOwnerId(performanceId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공연을 찾을 수 없습니다."));
    }
}
