package art.yesulin.application.audition;

import static art.yesulin.domain.audition.AuditionErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.PerformancePeriod;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
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
        ensureOwnedPerformance(ownerId, command.performanceId());
        try {
            return createInNewTransaction(ownerId, command);
        } catch (DataIntegrityViolationException exception) {
            return restoreInNewTransaction(ownerId, command, exception);
        }
    }

    @Transactional
    public AuditionResult updateBasicInformation(
            long ownerId,
            UUID auditionId,
            UpdateAuditionBasicInformationCommand command
    ) {
        Audition audition = getAuditionForUpdate(ownerId, auditionId);
        PerformancePeriod performancePeriod = command.performancePeriod();
        ensureScheduleWithinPerformance(audition, performancePeriod);
        audition.updateBasicInformation(command.title(), performancePeriod);
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

    private AuditionResult createInNewTransaction(long ownerId, CreateAuditionCommand command) {
        return creationTransaction.execute(status -> {
            Audition audition = new Audition(
                    command.id(), command.performanceId(), ownerId, command.title(), command.performancePeriod()
            );
            return AuditionResult.from(auditionRepository.saveAndFlush(audition));
        });
    }

    private AuditionResult restoreInNewTransaction(
            long ownerId,
            CreateAuditionCommand command,
            DataIntegrityViolationException creationFailure
    ) {
        return creationTransaction.execute(status -> auditionRepository.findByPublicIdForUpdate(command.id())
                .map(existing -> restoreDraft(ownerId, existing, command.title(), command.performancePeriod()))
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
