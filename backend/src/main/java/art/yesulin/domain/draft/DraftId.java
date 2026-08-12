package art.yesulin.domain.draft;

import art.yesulin.domain.common.DomainError;
import art.yesulin.domain.common.DomainException;

public record DraftId(long value) { // no-excuse-ok: domain value object

    public DraftId {
        if (value <= 0) {
            throw new DomainException(DomainError.INVALID_ID);
        }
    }
}
