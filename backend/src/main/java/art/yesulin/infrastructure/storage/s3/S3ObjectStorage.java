package art.yesulin.infrastructure.storage.s3;

import art.yesulin.application.file.storage.ObjectStorage;
import art.yesulin.application.file.storage.PresignedUpload;
import art.yesulin.application.file.storage.StoredObjectContent;
import art.yesulin.application.file.storage.StoredObjectMetadata;
import java.util.Map;
import java.util.Optional;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

public class S3ObjectStorage implements ObjectStorage {

    private final S3Client s3Client;
    private final S3Presigner presigner;
    private final S3StorageProperties properties;

    public S3ObjectStorage(S3Client s3Client, S3Presigner presigner, S3StorageProperties properties) {
        this.s3Client = s3Client;
        this.presigner = presigner;
        this.properties = properties;
    }

    @Override
    public PresignedUpload createUpload(String objectKey, String contentType, long size) {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(properties.bucket())
                .key(toPhysicalKey(objectKey))
                .contentType(contentType)
                .build();
        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(properties.uploadExpiration())
                .putObjectRequest(putObjectRequest)
                .build();
        PresignedPutObjectRequest presignedRequest = presigner.presignPutObject(presignRequest);

        return new PresignedUpload(
                presignedRequest.url().toString(),
                "PUT",
                presignedRequest.expiration(),
                Map.of("Content-Type", contentType)
        );
    }

    @Override
    public Optional<StoredObjectMetadata> inspect(String objectKey) {
        HeadObjectRequest request = HeadObjectRequest.builder()
                .bucket(properties.bucket())
                .key(toPhysicalKey(objectKey))
                .build();
        try {
            HeadObjectResponse response = s3Client.headObject(request);
            return Optional.of(new StoredObjectMetadata(response.contentType(), response.contentLength()));
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) {
                return Optional.empty();
            }
            throw exception;
        }
    }

    @Override
    public String createDownloadUrl(String objectKey) {
        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(properties.bucket())
                .key(toPhysicalKey(objectKey))
                .build();
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(properties.downloadExpiration())
                .getObjectRequest(request)
                .build();
        return presigner.presignGetObject(presignRequest).url().toString();
    }

    @Override
    public Optional<StoredObjectContent> read(String objectKey) {
        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(properties.bucket())
                .key(toPhysicalKey(objectKey))
                .build();
        try {
            var response = s3Client.getObjectAsBytes(request);
            return Optional.of(new StoredObjectContent(response.response().contentType(), response.asByteArray()));
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) {
                return Optional.empty();
            }
            throw exception;
        }
    }

    @Override
    public String toPublicUrl(String objectKey) {
        return properties.publicBaseUrl() + "/" + removePublicPrefix(objectKey);
    }

    private String toPhysicalKey(String objectKey) {
        return properties.keyPrefix() + "/" + removeLeadingSlash(objectKey);
    }

    private String removeLeadingSlash(String value) {
        return value.replaceFirst("^/+", "");
    }

    private String removePublicPrefix(String objectKey) {
        return removeLeadingSlash(objectKey).replaceFirst("^public/", "");
    }
}
