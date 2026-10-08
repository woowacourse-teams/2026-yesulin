package art.yesulin.dormant.application.audition;

import static art.yesulin.dormant.domain.audition.AuditionErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.dormant.domain.audition.Audition;
import art.yesulin.dormant.domain.audition.AuditionPublicationPolicy;
import art.yesulin.dormant.domain.audition.AuditionRepository;
import art.yesulin.dormant.domain.audition.form.AuditionFormRepository;
import art.yesulin.dormant.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.dormant.domain.audition.schedule.AuditionScheduleRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditionPublicationService {

    private final AuditionPublicationPolicy publicationPolicy = new AuditionPublicationPolicy();
    private final AuditionRepository auditionRepository;
    private final AuditionRoleSectionRepository roleSectionRepository;
    private final AuditionScheduleRepository scheduleRepository;
    private final AuditionFormRepository formRepository;
    private final Clock clock;

    @Transactional
    public AuditionResult publish(long ownerId, UUID auditionId) {
        Audition audition = getAuditionForUpdate(ownerId, auditionId);
        long internalAuditionId = audition.getId();
        publicationPolicy.publish(
                audition,
                roleSectionRepository.findByAuditionId(internalAuditionId),
                scheduleRepository.findByAuditionId(internalAuditionId),
                formRepository.findByAuditionId(internalAuditionId),
                Instant.now(clock)
        );
        return AuditionResult.from(audition);
    }

    private Audition getAuditionForUpdate(long ownerId, UUID auditionId) {
        return auditionRepository.findByPublicIdAndOwnerIdForUpdate(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
    }

}
