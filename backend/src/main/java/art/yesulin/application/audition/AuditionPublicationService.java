package art.yesulin.application.audition;

import static art.yesulin.domain.audition.AuditionErrorCode.NOT_FOUND;
import static art.yesulin.domain.audition.AuditionErrorCode.PUBLISHING_NOT_READY;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.form.AuditionFormRepository;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.schedule.AuditionSchedule;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditionPublicationService {

    private final AuditionRepository auditionRepository;
    private final AuditionRoleSectionRepository roleSectionRepository;
    private final AuditionScheduleRepository scheduleRepository;
    private final AuditionFormRepository formRepository;
    private final Clock clock;

    @Transactional
    public AuditionResult publish(long ownerId, long auditionId) {
        Audition audition = getAuditionForUpdate(ownerId, auditionId);
        if (audition.isPublished()) {
            return AuditionResult.from(audition);
        }
        ensureRoleSectionExists(auditionId);
        AuditionSchedule schedule = getSchedule(auditionId);
        ensureFormExists(auditionId);
        Instant publicationTime = Instant.now(clock);
        schedule.ensurePublishableAt(publicationTime);
        audition.publish(publicationTime);
        return AuditionResult.from(audition);
    }

    private Audition getAuditionForUpdate(long ownerId, long auditionId) {
        return auditionRepository.findByIdAndOwnerIdForUpdate(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
    }

    private void ensureRoleSectionExists(long auditionId) {
        roleSectionRepository.findByAuditionId(auditionId).orElseThrow(
                () -> new BusinessException(PUBLISHING_NOT_READY, "배역 정보를 저장한 뒤 공고를 게시할 수 있습니다.")
        );
    }

    private AuditionSchedule getSchedule(long auditionId) {
        return scheduleRepository.findByAuditionId(auditionId).orElseThrow(
                () -> new BusinessException(PUBLISHING_NOT_READY, "일정을 저장한 뒤 공고를 게시할 수 있습니다.")
        );
    }

    private void ensureFormExists(long auditionId) {
        formRepository.findByAuditionId(auditionId).orElseThrow(
                () -> new BusinessException(PUBLISHING_NOT_READY, "지원 폼을 저장한 뒤 공고를 게시할 수 있습니다.")
        );
    }
}
