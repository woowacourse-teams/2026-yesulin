package art.yesulin.application.audition.query;

import static art.yesulin.domain.audition.AuditionErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.query.AuditionManagementListResult;
import art.yesulin.domain.audition.query.AuditionManagementResult;
import art.yesulin.domain.audition.query.AuditionSearchCondition;
import art.yesulin.domain.audition.query.PerformanceManagementResult;
import art.yesulin.domain.performance.PerformanceErrorCode;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuditionManagementQueryService {

    private final AuditionRepository auditionRepository;
    private final Clock clock;

    public List<PerformanceManagementResult> findPerformances(long ownerId) {
        return auditionRepository.findPerformances(ownerId, Instant.now(clock));
    }

    public PerformanceManagementResult findPerformance(long ownerId, long performanceId) {
        return auditionRepository.findPerformance(ownerId, performanceId, Instant.now(clock))
                .orElseThrow(() -> new BusinessException(PerformanceErrorCode.NOT_FOUND, "공연을 찾을 수 없습니다."));
    }

    public AuditionManagementListResult findAuditions(
            long ownerId,
            long performanceId,
            String keyword,
            String phase
    ) {
        AuditionSearchCondition condition = new AuditionSearchCondition(keyword, phase);
        return auditionRepository.findAuditions(ownerId, performanceId, Instant.now(clock), condition)
                .orElseThrow(() -> new BusinessException(PerformanceErrorCode.NOT_FOUND, "공연을 찾을 수 없습니다."));
    }

    public AuditionManagementResult findAudition(long ownerId, UUID auditionId) {
        return auditionRepository.findAudition(ownerId, auditionId, Instant.now(clock))
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
    }
}
