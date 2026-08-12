package art.yesulin.domain.company;

import art.yesulin.domain.common.DomainError;
import art.yesulin.domain.common.DomainException;

public record CompanyMemberId(long value) { // no-excuse-ok: domain value object

    public CompanyMemberId {
        if (value <= 0) {
            throw new DomainException(DomainError.INVALID_ID);
        }
    }
}
