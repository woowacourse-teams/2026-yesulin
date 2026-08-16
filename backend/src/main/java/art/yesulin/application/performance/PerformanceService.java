package art.yesulin.application.performance;

import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.performance.RoadAddress;
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
}
