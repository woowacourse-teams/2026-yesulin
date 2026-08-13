package art.yesulin.presentation.applicant;

import art.yesulin.application.draft.DraftSyncCommand;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.OffsetDateTime;
import tools.jackson.databind.JsonNode;

public record DraftSyncRequest(
        @Positive long postingId,
        @NotNull JsonNode content,
        @Positive Long expectedRevision,
        @NotNull OffsetDateTime clientModifiedAt) {

    DraftSyncCommand toCommand() {
        return new DraftSyncCommand(
                postingId, content.toString(), expectedRevision, clientModifiedAt.toInstant());
    }
}
