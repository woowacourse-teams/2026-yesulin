package art.yesulin.domain.applicant;

import art.yesulin.domain.common.DomainError;
import art.yesulin.domain.common.DomainException;

public record ApplicantId(long value) { // no-excuse-ok: domain value object

    public ApplicantId {
        if (value <= 0) {
            throw new DomainException(DomainError.INVALID_ID);
        }
    }
}
