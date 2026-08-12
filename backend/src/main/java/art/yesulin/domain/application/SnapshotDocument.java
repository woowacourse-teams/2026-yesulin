package art.yesulin.domain.application;

import art.yesulin.domain.common.DomainError;
import art.yesulin.domain.common.DomainException;

public record SnapshotDocument(String json) { // no-excuse-ok: domain value object

    public SnapshotDocument {
        if (json == null || json.isBlank()) {
            throw new DomainException(DomainError.INVALID_SNAPSHOT);
        }
    }

    public static SnapshotDocument of(String json) {
        return new SnapshotDocument(json);
    }
}
