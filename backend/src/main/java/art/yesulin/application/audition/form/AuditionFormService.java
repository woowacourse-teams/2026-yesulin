package art.yesulin.application.audition.form;

import static art.yesulin.domain.audition.AuditionErrorCode.FORM_NOT_FOUND;
import static art.yesulin.domain.audition.AuditionErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.form.AuditionForm;
import art.yesulin.domain.audition.form.AuditionFormPlan;
import art.yesulin.domain.audition.form.AuditionFormRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditionFormService {

    private final AuditionRepository auditionRepository;
    private final AuditionFormRepository formRepository;

    @Transactional
    public AuditionFormResult save(long ownerId, UUID auditionId, SaveAuditionFormCommand command) {
        Audition audition = getOwnedAuditionForUpdate(ownerId, auditionId);
        AuditionFormPlan plan = command.toPlan();
        AuditionForm form = formRepository.findByAuditionId(audition.getId())
                .map(existingForm -> existingForm.replace(plan))
                .orElseGet(() -> new AuditionForm(audition.getId(), plan));
        return AuditionFormResult.from(auditionId, formRepository.save(form));
    }

    @Transactional(readOnly = true)
    public AuditionFormResult find(long ownerId, UUID auditionId) {
        Audition audition = getOwnedAudition(ownerId, auditionId);
        AuditionForm form = formRepository.findByAuditionId(audition.getId())
                .orElseThrow(() -> new BusinessException(FORM_NOT_FOUND, "지원 폼을 찾을 수 없습니다."));
        return AuditionFormResult.from(auditionId, form);
    }

    private Audition getOwnedAudition(long ownerId, UUID auditionId) {
        return auditionRepository.findByPublicIdAndOwnerId(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
    }

    private Audition getOwnedAuditionForUpdate(long ownerId, UUID auditionId) {
        return auditionRepository.findByPublicIdAndOwnerIdForUpdate(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
    }
}
