package art.yesulin.application.file.storage;

import java.time.Instant;
import java.util.Map;

public record PresignedUpload(String url, String method, Instant expiresAt, Map<String, String> headers) {

    public PresignedUpload {
        headers = Map.copyOf(headers);
    }
}
