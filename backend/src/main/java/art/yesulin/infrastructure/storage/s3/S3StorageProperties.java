package art.yesulin.infrastructure.storage.s3;

import java.net.URI;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("yesulin.storage.s3")
public record S3StorageProperties(
        String bucket,
        String keyPrefix,
        URI publicBaseUrl,
        String region,
        Duration uploadExpiration
) {

    private static final Duration MAXIMUM_UPLOAD_EXPIRATION = Duration.ofDays(7);

    public S3StorageProperties(
            String bucket,
            String keyPrefix,
            URI publicBaseUrl,
            String region,
            Duration uploadExpiration
    ) {
        this.bucket = requireText(bucket, "S3 bucket");
        this.keyPrefix = normalizePrefix(keyPrefix);
        this.publicBaseUrl = normalizePublicBaseUrl(publicBaseUrl);
        this.region = requireText(region, "AWS region");
        this.uploadExpiration = requireValidExpiration(uploadExpiration);
    }

    private static String normalizePrefix(String keyPrefix) {
        String value = requireText(keyPrefix, "S3 key prefix");
        return value.replaceAll("^/+|/+$", "");
    }

    private static URI normalizePublicBaseUrl(URI publicBaseUrl) {
        if (publicBaseUrl == null || publicBaseUrl.getScheme() == null || publicBaseUrl.getHost() == null) {
            throw new IllegalArgumentException("Public base URL must be an absolute URL.");
        }
        return URI.create(publicBaseUrl.toString().replaceAll("/+$", ""));
    }

    private static Duration requireValidExpiration(Duration uploadExpiration) {
        if (uploadExpiration == null || uploadExpiration.isZero() || uploadExpiration.isNegative()) {
            throw new IllegalArgumentException("Upload expiration must be positive.");
        }
        if (uploadExpiration.compareTo(MAXIMUM_UPLOAD_EXPIRATION) > 0) {
            throw new IllegalArgumentException("Upload expiration cannot exceed seven days.");
        }
        return uploadExpiration;
    }

    private static String requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank.");
        }
        return value;
    }
}
