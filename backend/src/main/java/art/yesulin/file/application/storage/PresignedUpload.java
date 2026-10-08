package art.yesulin.file.application.storage;

import java.time.Instant;
import java.util.Map;

public record PresignedUpload(String url, String method, Instant expiresAt, Map<String, String> headers) {

    public PresignedUpload {
        headers = Map.copyOf(headers);
    }
}
