package art.yesulin.application.audition;

import static art.yesulin.domain.audition.AuditionErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.PerformancePeriod;
import art.yesulin.domain.performance.PerformanceErrorCode;
import art.yesulin.domain.performance.PerformanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditionService {

    private final AuditionRepository auditionRepository;
    private final PerformanceRepository performanceRepository;

    @Transactional
    public AuditionResult create(long ownerId, CreateAuditionCommand command) {
        ensureOwnedPerformance(ownerId, command.performanceId());
        PerformancePeriod performancePeriod = command.performancePeriod();
        Audition audition = new Audition(command.performanceId(), ownerId, command.title(), performancePeriod);
        return AuditionResult.from(auditionRepository.save(audition));
    }

    @Transactional
    public AuditionResult updateBasicInformation(
            long ownerId,
            long auditionId,
            UpdateAuditionBasicInformationCommand command
    ) {
        Audition audition = getAudition(ownerId, auditionId);
        audition.updateBasicInformation(command.title(), command.performancePeriod());
        return AuditionResult.from(audition);
    }

    @Transactional(readOnly = true)
    public AuditionResult find(long ownerId, long auditionId) {
        Audition audition = getAudition(ownerId, auditionId);
        return AuditionResult.from(audition);
    }

    private void ensureOwnedPerformance(long ownerId, long performanceId) {
        if (!performanceRepository.existsByIdAndOwnerId(performanceId, ownerId)) {
            throw new BusinessException(PerformanceErrorCode.NOT_FOUND, "공연을 찾을 수 없습니다.");
        }
    }

    private Audition getAudition(long ownerId, long auditionId) {
        return auditionRepository.findByIdAndOwnerId(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
    }
}
