package art.yesulin.domain.application;

import art.yesulin.domain.common.DomainError;
import art.yesulin.domain.common.DomainException;

public record ApplicationId(long value) { // no-excuse-ok: domain value object

    public ApplicationId {
        if (value <= 0) {
            throw new DomainException(DomainError.INVALID_ID);
        }
    }
}
