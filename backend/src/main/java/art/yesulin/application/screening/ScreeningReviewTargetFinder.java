package art.yesulin.application.screening;

import static art.yesulin.domain.screening.ScreeningReviewErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.screening.ScreeningRound;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class ScreeningReviewTargetFinder {

    private final AuditionRepository auditionRepository;
    private final AuditionRoleSectionRepository roleSectionRepository;
    private final AuditionScheduleRepository scheduleRepository;

    ScreeningReviewTarget find(long ownerId, long roleId, ScreeningRound round) {
        long auditionId = findAuditionId(roleId);
        auditionRepository.findByIdAndOwnerId(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "심사할 공고를 찾을 수 없습니다."));
        return new ScreeningReviewTarget(roleId, findStageId(auditionId, round), round);
    }

    ScreeningReviewTarget findForUpdate(long ownerId, long roleId, ScreeningRound round) {
        long auditionId = findAuditionId(roleId);
        auditionRepository.findByIdAndOwnerIdForUpdate(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "심사할 공고를 찾을 수 없습니다."));
        return new ScreeningReviewTarget(roleId, findStageId(auditionId, round), round);
    }

    private long findAuditionId(long roleId) {
        return roleSectionRepository.findAuditionIdByRoleId(roleId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "심사할 공고 배역이 없습니다."));
    }

    private long findStageId(long auditionId, ScreeningRound round) {
        return scheduleRepository.findStageIdByAuditionIdAndOrder(auditionId, round.stageOrder())
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "심사할 전형을 찾을 수 없습니다."));
    }
}
