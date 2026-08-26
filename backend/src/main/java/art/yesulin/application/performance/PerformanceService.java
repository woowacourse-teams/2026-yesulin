package art.yesulin.application.performance;

import static art.yesulin.domain.performance.PerformanceErrorCode.HAS_AUDITIONS;
import static art.yesulin.domain.performance.PerformanceErrorCode.NOT_FOUND;

import art.yesulin.application.file.FileReferenceService;
import art.yesulin.application.file.UnlinkFileCommand;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PerformanceService {

    private static final String POSTER_REFERENCE_TYPE = "PERFORMANCE_POSTER";

    private final PerformanceRepository performanceRepository;
    private final AuditionRepository auditionRepository;
    private final FileReferenceService fileReferenceService;

    @Transactional
    public PerformanceResult create(long ownerId, CreatePerformanceCommand command) {
        Performance performance = new Performance(
                ownerId, command.posterFileId(), command.title(), command.venue().toVenue()
        );
        command.roles().forEach(role -> performance.addRole(role.name(), role.description()));
        return PerformanceResult.from(performanceRepository.saveAndFlush(performance));
    }

    @Transactional(readOnly = true)
    public List<PerformanceResult> findAll(long ownerId) {
        return performanceRepository.findAllByOwnerIdOrderByCreatedAtDesc(ownerId).stream()
                .map(PerformanceResult::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public PerformanceResult find(long ownerId, long performanceId) {
        return PerformanceResult.from(getPerformance(ownerId, performanceId));
    }

    @Transactional
    public PerformanceResult updateBasicInformation(
            long ownerId,
            long performanceId,
            UpdatePerformanceBasicInformationCommand command
    ) {
        Performance performance = getEditablePerformance(ownerId, performanceId);
        performance.updateBasicInformation(command.title(), command.venue().toVenue());
        return PerformanceResult.from(performance);
    }

    @Transactional
    public PerformanceResult update(long ownerId, long performanceId, UpdatePerformanceCommand command) {
        Performance performance = getEditablePerformance(ownerId, performanceId);
        performance.updateBasicInformation(command.title(), command.venue().toVenue());
        performance.updatePoster(command.posterFileId());
        performance.clearRoles();
        performanceRepository.saveAndFlush(performance);
        command.roles().forEach(role -> performance.addRole(role.name(), role.description()));
        return PerformanceResult.from(performanceRepository.saveAndFlush(performance));
    }

    @Transactional
    public PerformanceResult updatePoster(long ownerId, long performanceId, UpdatePerformancePosterCommand command) {
        Performance performance = getEditablePerformance(ownerId, performanceId);
        performance.updatePoster(command.posterFileId());
        return PerformanceResult.from(performanceRepository.save(performance));
    }

    @Transactional
    public void delete(long ownerId, long performanceId) {
        Performance performance = getEditablePerformance(ownerId, performanceId);
        fileReferenceService.unlinkFile(new UnlinkFileCommand(
                performance.getPosterFileId(), POSTER_REFERENCE_TYPE, performance.getId()
        ));
        performanceRepository.delete(performance);
    }

    private Performance getEditablePerformance(long ownerId, long performanceId) {
        Performance performance = performanceRepository.findByIdAndOwnerIdForUpdate(performanceId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공연을 찾을 수 없습니다."));
        if (auditionRepository.existsByPerformanceId(performanceId)) {
            throw new BusinessException(HAS_AUDITIONS, "등록된 공고가 있어 공연을 수정하거나 삭제할 수 없습니다.");
        }
        return performance;
    }

    private Performance getPerformance(long ownerId, long performanceId) {
        return performanceRepository.findByIdAndOwnerId(performanceId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공연을 찾을 수 없습니다."));
    }
}
