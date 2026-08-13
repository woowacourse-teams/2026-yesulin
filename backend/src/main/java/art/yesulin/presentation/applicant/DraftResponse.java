package art.yesulin.presentation.applicant;

import art.yesulin.application.draft.DraftResult;
import java.time.Instant;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

public record DraftResponse(
        long id,
        long postingId,
        JsonNode content,
        long revision,
        Instant clientModifiedAt,
        Instant serverModifiedAt,
        String status) {

    static DraftResponse from(DraftResult result, ObjectMapper objectMapper) {
        try {
            return new DraftResponse(
                    result.id(), result.postingId(), objectMapper.readTree(result.contentJson()),
                    result.revision(), result.clientModifiedAt(), result.serverModifiedAt(),
                    result.status());
        } catch (JacksonException exception) {
            throw new IllegalStateException("저장된 Draft JSON을 읽을 수 없습니다.", exception);
        }
    }
}
