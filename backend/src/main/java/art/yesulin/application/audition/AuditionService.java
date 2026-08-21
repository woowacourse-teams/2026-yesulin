package art.yesulin.application.audition;

import static art.yesulin.domain.audition.AuditionErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.PerformancePeriod;
import art.yesulin.domain.performance.PerformanceErrorCode;
import art.yesulin.domain.performance.PerformanceRepository;
import java.util.List;
import java.util.UUID;
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
        Audition audition = auditionRepository.findByPublicId(command.id())
                .map(existing -> restoreDraft(ownerId, existing, command.title(), performancePeriod))
                .orElseGet(() -> new Audition(
                        command.id(), command.performanceId(), ownerId, command.title(), performancePeriod
                ));
        return AuditionResult.from(auditionRepository.save(audition));
    }

    @Transactional
    public AuditionResult updateBasicInformation(
            long ownerId,
            UUID auditionId,
            UpdateAuditionBasicInformationCommand command
    ) {
        Audition audition = getAuditionForUpdate(ownerId, auditionId);
        audition.updateBasicInformation(command.title(), command.performancePeriod());
        return AuditionResult.from(audition);
    }

    @Transactional(readOnly = true)
    public AuditionResult find(long ownerId, UUID auditionId) {
        Audition audition = getAudition(ownerId, auditionId);
        return AuditionResult.from(audition);
    }

    @Transactional(readOnly = true)
    public List<AuditionResult> findAll(long ownerId, long performanceId) {
        ensureOwnedPerformance(ownerId, performanceId);
        return auditionRepository.findAllByPerformanceIdAndOwnerIdOrderByCreatedAtDescIdDesc(performanceId, ownerId)
                .stream()
                .map(AuditionResult::from)
                .toList();
    }

    private void ensureOwnedPerformance(long ownerId, long performanceId) {
        if (!performanceRepository.existsByIdAndOwnerId(performanceId, ownerId)) {
            throw new BusinessException(PerformanceErrorCode.NOT_FOUND, "공연을 찾을 수 없습니다.");
        }
    }

    private Audition restoreDraft(
            long ownerId,
            Audition audition,
            String title,
            PerformancePeriod performancePeriod
    ) {
        if (audition.getOwnerId() != ownerId) {
            throw new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다.");
        }
        if (!audition.isPublished()) {
            audition.updateBasicInformation(title, performancePeriod);
        }
        return audition;
    }

    private Audition getAudition(long ownerId, UUID auditionId) {
        return auditionRepository.findByPublicIdAndOwnerId(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
    }

    private Audition getAuditionForUpdate(long ownerId, UUID auditionId) {
        return auditionRepository.findByPublicIdAndOwnerIdForUpdate(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
    }
}
