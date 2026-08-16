package art.yesulin.application.file;

import java.time.Instant;
import java.util.Map;

public record FileUploadResult(
        long fileId,
        String uploadUrl,
        String method,
        Instant expiresAt,
        Map<String, String> headers
) {

    public FileUploadResult {
        headers = Map.copyOf(headers);
    }
}
