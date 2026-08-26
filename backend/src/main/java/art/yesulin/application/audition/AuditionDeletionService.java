package art.yesulin.application.audition;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_STATUS;
import static art.yesulin.domain.audition.AuditionErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.form.AuditionFormRepository;
import art.yesulin.domain.audition.role.AuditionRole;
import art.yesulin.domain.audition.role.AuditionRoleSection;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.screening.ScreeningCompletionRepository;
import art.yesulin.domain.screening.ScreeningReviewRepository;
import art.yesulin.domain.submission.SubmissionRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditionDeletionService {

    private final AuditionRepository auditionRepository;
    private final AuditionRoleSectionRepository roleSectionRepository;
    private final AuditionScheduleRepository scheduleRepository;
    private final AuditionFormRepository formRepository;
    private final SubmissionRepository submissionRepository;
    private final ScreeningCompletionRepository screeningCompletionRepository;
    private final ScreeningReviewRepository screeningReviewRepository;

    /**
     * 배역·일정·지원 폼을 함께 지운다. 접수된 지원서는 배우의 기록이라 한 건이라도 있으면 삭제하지 않는다.
     */
    @Transactional
    public void delete(long ownerId, UUID auditionId) {
        Audition audition = getAuditionForUpdate(ownerId, auditionId);
        long internalAuditionId = audition.getId();
        if (submissionRepository.existsByAuditionId(internalAuditionId)) {
            throw new BusinessException(INVALID_STATUS, "접수된 지원서가 있어 공고를 삭제할 수 없습니다.");
        }
        roleSectionRepository.findByAuditionId(internalAuditionId).ifPresent(this::deleteRoleSection);
        scheduleRepository.findByAuditionId(internalAuditionId).ifPresent(scheduleRepository::delete);
        formRepository.findByAuditionId(internalAuditionId).ifPresent(formRepository::delete);
        auditionRepository.delete(audition);
    }

    private void deleteRoleSection(AuditionRoleSection roleSection) {
        List<Long> roleIds = roleSection.getRoles().stream().map(AuditionRole::getId).toList();
        if (!roleIds.isEmpty()) {
            screeningReviewRepository.deleteByAuditionRoleIdIn(roleIds);
            screeningCompletionRepository.deleteByAuditionRoleIdIn(roleIds);
        }
        roleSectionRepository.delete(roleSection);
    }

    private Audition getAuditionForUpdate(long ownerId, UUID auditionId) {
        return auditionRepository.findByPublicIdAndOwnerIdForUpdate(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
    }
}
