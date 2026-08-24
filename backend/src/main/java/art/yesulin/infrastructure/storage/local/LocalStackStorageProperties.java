package art.yesulin.infrastructure.storage.local;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("yesulin.storage.localstack")
public record LocalStackStorageProperties(
        String endpoint,
        String presignerEndpoint,
        String accessKey,
        String secretKey
) {

    private static final String DEFAULT_ACCESS_KEY = "test";
    private static final String DEFAULT_SECRET_KEY = "test";

    public LocalStackStorageProperties {
        accessKey = defaultIfBlank(accessKey, DEFAULT_ACCESS_KEY);
        secretKey = defaultIfBlank(secretKey, DEFAULT_SECRET_KEY);
    }

    URI requireEndpoint() {
        if (endpoint == null || endpoint.isBlank()) {
            throw new IllegalStateException(
                    "LocalStack endpoint is required when Testcontainers is disabled."
            );
        }
        return URI.create(endpoint);
    }

    URI resolvePresignerEndpoint() {
        String resolved = defaultIfBlank(presignerEndpoint, endpoint);
        return URI.create(resolved);
    }

    private static String defaultIfBlank(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value;
    }
}
