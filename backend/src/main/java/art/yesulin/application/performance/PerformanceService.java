package art.yesulin.application.performance;

import static art.yesulin.domain.performance.PerformanceErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.performance.PerformanceRoleChange;
import art.yesulin.domain.performance.RoadAddress;
import java.util.List;
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
                ownerId, command.posterFileId(), command.title(), new RoadAddress(command.roadAddress())
        );
        command.roles().forEach(role -> performance.addRole(role.name(), role.description()));
        return PerformanceResult.from(performanceRepository.saveAndFlush(performance));
    }

    @Transactional
    public PerformanceResult update(long ownerId, long performanceId, UpdatePerformanceCommand command) {
        Performance performance = performanceRepository.findByIdAndOwnerId(performanceId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공연을 찾을 수 없습니다."));
        List<PerformanceRoleChange> roles = command.roles().stream()
                .map(UpdatePerformanceRoleCommand::toDomain)
                .toList();
        performance.update(
                command.posterFileId(), command.title(), new RoadAddress(command.roadAddress()), roles
        );
        return PerformanceResult.from(performanceRepository.saveAndFlush(performance));
    }
}
