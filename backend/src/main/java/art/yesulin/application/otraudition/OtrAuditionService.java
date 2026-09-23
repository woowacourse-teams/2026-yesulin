package art.yesulin.application.otraudition;

import static art.yesulin.domain.otraudition.OtrAuditionErrorCode.DUPLICATE_OTR_ID;
import static art.yesulin.domain.otraudition.OtrAuditionErrorCode.INVALID_INPUT;
import static art.yesulin.domain.otraudition.OtrAuditionErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.otraudition.OtrAudition;
import art.yesulin.domain.otraudition.OtrAuditionRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OtrAuditionService {

    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");

    private final OtrAuditionRepository repository;
    private final Clock clock;

    @Transactional
    public OtrAuditionResult create(long ownerId, String otrId, String title, List<String> roles, LocalDate deadline) {
        if (deadline != null && deadline.isBefore(LocalDate.now(clock.withZone(KOREA)))) {
            throw new BusinessException(INVALID_INPUT, "마감일은 오늘 이후로 입력해 주세요.");
        }
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

    @Transactional(readOnly = true)
    public OtrAuditionResult find(long ownerId, UUID publicId) {
        return repository.findByPublicIdAndOwnerId(publicId, ownerId)
                .map(OtrAuditionResult::from)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "OTR 공고를 찾을 수 없습니다."));
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
