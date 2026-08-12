package art.yesulin.domain.company;

import art.yesulin.domain.common.DomainError;
import art.yesulin.domain.common.DomainException;

public record CompanyId(long value) { // no-excuse-ok: domain value object

    public CompanyId {
        if (value <= 0) {
            throw new DomainException(DomainError.INVALID_ID);
        }
    }
}
