package art.yesulin.domain.recruitment;

import art.yesulin.domain.common.DomainError;
import art.yesulin.domain.common.DomainException;

public record PostingId(long value) { // no-excuse-ok: domain value object

    public PostingId {
        if (value <= 0) {
            throw new DomainException(DomainError.INVALID_ID);
        }
    }
}
