package art.yesulin.application.otraudition;

import static art.yesulin.domain.otraudition.OtrAuditionErrorCode.DUPLICATE_OTR_ID;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.otraudition.OtrAudition;
import art.yesulin.domain.otraudition.OtrAuditionRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OtrAuditionService {

    private final OtrAuditionRepository repository;

    @Transactional
    public OtrAuditionResult create(long ownerId, String otrId, String title, List<String> roles, LocalDate deadline) {
        OtrAudition audition = new OtrAudition(ownerId, otrId, title, roles, deadline);
        if (repository.existsByOwnerIdAndOtrId(ownerId, audition.getOtrId())) {
            throw duplicate();
        }
        try {
            return OtrAuditionResult.from(repository.saveAndFlush(audition));
        } catch (DataIntegrityViolationException exception) {
            if (isDuplicateOtrId(exception)) {
                throw duplicate();
            }
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public List<OtrAuditionResult> findAll(long ownerId) {
        return repository.findAllByOwnerIdOrderByCreatedAtDescIdDesc(ownerId).stream()
                .map(OtrAuditionResult::from)
                .toList();
    }

    private BusinessException duplicate() {
        return new BusinessException(DUPLICATE_OTR_ID, "이미 등록한 OTR 공고 번호입니다.");
    }

    private boolean isDuplicateOtrId(DataIntegrityViolationException exception) {
        Throwable cause = exception;
        while (cause != null) {
            if (cause instanceof ConstraintViolationException violation
                    && violation.getConstraintName() != null
                    && violation.getConstraintName().toLowerCase(Locale.ROOT)
                            .contains("uk_otr_auditions_owner_otr_id")) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }
}
