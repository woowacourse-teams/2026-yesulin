package art.yesulin.domain.draft;

import art.yesulin.domain.common.DomainError;
import art.yesulin.domain.common.DomainException;

public record DraftContent(String json) { // no-excuse-ok: domain value object

    public DraftContent {
        if (json == null || json.isBlank()) {
            throw new DomainException(DomainError.INVALID_DRAFT_CONTENT);
        }
    }

    public static DraftContent of(String json) {
        return new DraftContent(json);
    }
}
