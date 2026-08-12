package art.yesulin.domain.account;

import art.yesulin.domain.common.DomainError;
import art.yesulin.domain.common.DomainException;

public record AccountId(long value) { // no-excuse-ok: domain value object

    public AccountId {
        if (value <= 0) {
            throw new DomainException(DomainError.INVALID_ID);
        }
    }
}
