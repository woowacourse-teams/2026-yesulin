package art.yesulin.application.audition;

import static art.yesulin.domain.audition.AuditionErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionPublicationPolicy;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.form.AuditionFormRepository;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import java.time.Clock;
import java.time.Instant;
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
    public AuditionResult publish(long ownerId, long auditionId) {
        Audition audition = getAuditionForUpdate(ownerId, auditionId);
        publicationPolicy.publish(
                audition,
                roleSectionRepository.findByAuditionId(auditionId),
                scheduleRepository.findByAuditionId(auditionId),
                formRepository.findByAuditionId(auditionId),
                Instant.now(clock)
        );
        return AuditionResult.from(audition);
    }

    private Audition getAuditionForUpdate(long ownerId, long auditionId) {
        return auditionRepository.findByIdAndOwnerIdForUpdate(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
    }

}
