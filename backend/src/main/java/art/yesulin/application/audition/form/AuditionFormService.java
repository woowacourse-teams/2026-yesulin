package art.yesulin.application.audition.form;

import static art.yesulin.domain.audition.AuditionErrorCode.FORM_NOT_FOUND;
import static art.yesulin.domain.audition.AuditionErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.form.AuditionForm;
import art.yesulin.domain.audition.form.AuditionFormPlan;
import art.yesulin.domain.audition.form.AuditionFormRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditionFormService {

    private final AuditionRepository auditionRepository;
    private final AuditionFormRepository formRepository;

    @Transactional
    public AuditionFormResult save(long ownerId, long auditionId, SaveAuditionFormCommand command) {
        ensureOwnedAuditionForUpdate(ownerId, auditionId);
        AuditionFormPlan plan = command.toPlan();
        AuditionForm form = formRepository.findByAuditionId(auditionId)
                .map(existingForm -> existingForm.replace(plan))
                .orElseGet(() -> new AuditionForm(auditionId, plan));
        return AuditionFormResult.from(formRepository.save(form));
    }

    @Transactional(readOnly = true)
    public AuditionFormResult find(long ownerId, long auditionId) {
        ensureOwnedAudition(ownerId, auditionId);
        AuditionForm form = formRepository.findByAuditionId(auditionId)
                .orElseThrow(() -> new BusinessException(FORM_NOT_FOUND, "지원 폼을 찾을 수 없습니다."));
        return AuditionFormResult.from(form);
    }

    private void ensureOwnedAudition(long ownerId, long auditionId) {
        auditionRepository.findByIdAndOwnerId(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
    }

    private void ensureOwnedAuditionForUpdate(long ownerId, long auditionId) {
        auditionRepository.findByIdAndOwnerIdForUpdate(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
    }
}
