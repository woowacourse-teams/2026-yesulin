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
        Duration uploadExpiration,
        Duration downloadExpiration
) {

    private static final Duration MAXIMUM_EXPIRATION = Duration.ofDays(7);

    public S3StorageProperties(
            String bucket,
            String keyPrefix,
            URI publicBaseUrl,
            String region,
            Duration uploadExpiration,
            Duration downloadExpiration
    ) {
        this.bucket = requireText(bucket, "S3 bucket");
        this.keyPrefix = normalizePrefix(keyPrefix);
        this.publicBaseUrl = normalizePublicBaseUrl(publicBaseUrl);
        this.region = requireText(region, "AWS region");
        this.uploadExpiration = requireValidExpiration(uploadExpiration, "Upload");
        this.downloadExpiration = requireValidExpiration(downloadExpiration, "Download");
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

    private static Duration requireValidExpiration(Duration expiration, String name) {
        if (expiration == null || expiration.isZero() || expiration.isNegative()) {
            throw new IllegalArgumentException(name + " expiration must be positive.");
        }
        if (expiration.compareTo(MAXIMUM_EXPIRATION) > 0) {
            throw new IllegalArgumentException(name + " expiration cannot exceed seven days.");
        }
        return expiration;
    }

    private static String requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank.");
        }
        return value;
    }
}
