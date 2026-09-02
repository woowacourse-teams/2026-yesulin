package art.yesulin.application.audition;

import static art.yesulin.domain.audition.AuditionErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.PerformancePeriod;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceErrorCode;
import art.yesulin.domain.performance.PerformanceRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AuditionService {

    private final AuditionRepository auditionRepository;
    private final PerformanceRepository performanceRepository;
    private final AuditionScheduleRepository scheduleRepository;
    private final TransactionTemplate creationTransaction;

    public AuditionService(
            AuditionRepository auditionRepository,
            PerformanceRepository performanceRepository,
            AuditionScheduleRepository scheduleRepository,
            PlatformTransactionManager transactionManager
    ) {
        this.auditionRepository = auditionRepository;
        this.performanceRepository = performanceRepository;
        this.scheduleRepository = scheduleRepository;
        this.creationTransaction = new TransactionTemplate(transactionManager);
        this.creationTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public AuditionResult create(long ownerId, CreateAuditionCommand command) {
        Performance performance = getOwnedPerformance(ownerId, command.performanceId());
        try {
            return createInNewTransaction(ownerId, command, performance);
        } catch (DataIntegrityViolationException exception) {
            return restoreInNewTransaction(ownerId, command, performance, exception);
        }
    }

    @Transactional
    public AuditionResult updateBasicInformation(
            long ownerId,
            UUID auditionId,
            UpdateAuditionBasicInformationCommand command
    ) {
        Audition audition = getAuditionForUpdate(ownerId, auditionId);
        PerformancePeriod performancePeriod = command.performanceStartDate() == null
                ? new PerformancePeriod(audition.getPerformanceStartDate(), audition.getPerformanceEndDate())
                : command.performancePeriod();
        ensureScheduleWithinPerformance(audition, performancePeriod);
        audition.updateBasicInformation(command.title(), performancePeriod, command.rehearsalVenue().toVenue());
        return AuditionResult.from(audition);
    }

    @Transactional(readOnly = true)
    public AuditionResult find(long ownerId, UUID auditionId) {
        Audition audition = getAudition(ownerId, auditionId);
        return AuditionResult.from(audition);
    }

    @Transactional(readOnly = true)
    public List<AuditionResult> findAll(long ownerId, long performanceId) {
        getOwnedPerformance(ownerId, performanceId);
        return auditionRepository.findAllByPerformanceIdAndOwnerIdOrderByCreatedAtDescIdDesc(performanceId, ownerId)
                .stream()
                .map(AuditionResult::from)
                .toList();
    }

    private AuditionResult createInNewTransaction(
            long ownerId,
            CreateAuditionCommand command,
            Performance performance
    ) {
        return creationTransaction.execute(status -> {
            Audition audition = new Audition(
                    command.id(), command.performanceId(), ownerId, command.title(),
                    performancePeriodOf(performance, command),
                    command.rehearsalVenue().toVenue()
            );
            return AuditionResult.from(auditionRepository.saveAndFlush(audition));
        });
    }

    private AuditionResult restoreInNewTransaction(
            long ownerId,
            CreateAuditionCommand command,
            Performance performance,
            DataIntegrityViolationException creationFailure
    ) {
        return creationTransaction.execute(status -> auditionRepository.findByPublicIdForUpdate(command.id())
                .map(existing -> restoreDraft(
                        ownerId, existing, command.title(), performancePeriodOf(performance, command)
                ))
                .map(AuditionResult::from)
                .orElseThrow(() -> creationFailure));
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
            ensureScheduleWithinPerformance(audition, performancePeriod);
            audition.updateBasicInformation(title, performancePeriod);
        }
        return audition;
    }

    private Performance getOwnedPerformance(long ownerId, long performanceId) {
        return performanceRepository.findByIdAndOwnerId(performanceId, ownerId)
                .orElseThrow(() -> new BusinessException(PerformanceErrorCode.NOT_FOUND, "공연을 찾을 수 없습니다."));
    }

    private PerformancePeriod performancePeriodOf(Performance performance, CreateAuditionCommand command) {
        if (performance.hasPerformancePeriod()) {
            return new PerformancePeriod(performance.getPerformanceStartDate(), performance.getPerformanceEndDate());
        }
        return command.performancePeriod();
    }

    private void ensureScheduleWithinPerformance(Audition audition, PerformancePeriod performancePeriod) {
        scheduleRepository.findByAuditionId(audition.getId())
                .ifPresent(schedule -> schedule.ensureWithinPerformanceEnd(performancePeriod.getEndDate()));
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
