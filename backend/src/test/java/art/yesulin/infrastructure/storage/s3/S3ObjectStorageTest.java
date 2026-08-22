package art.yesulin.infrastructure.storage.s3;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import art.yesulin.application.file.storage.PresignedUpload;
import art.yesulin.application.file.storage.StoredObjectMetadata;
import java.net.URI;
import java.net.URL;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

class S3ObjectStorageTest {

    private static final String BUCKET = "techcourse-project-2026";
    private static final String KEY_PREFIX = "yesulin";
    private static final URI PUBLIC_BASE_URL = URI.create("https://cdn.example.com");
    private static final Duration UPLOAD_EXPIRATION = Duration.ofMinutes(10);

    private S3Client s3Client;
    private S3Presigner presigner;
    private S3ObjectStorage objectStorage;

    @BeforeEach
    void setUp() {
        s3Client = mock(S3Client.class);
        presigner = mock(S3Presigner.class);
        S3StorageProperties properties = new S3StorageProperties(
                BUCKET, KEY_PREFIX, PUBLIC_BASE_URL, "ap-northeast-2", UPLOAD_EXPIRATION, UPLOAD_EXPIRATION
        );
        objectStorage = new S3ObjectStorage(s3Client, presigner, properties);
    }

    @Test
    void createsPresignedPutForTeamPrefix() throws Exception {
        Instant expiresAt = Instant.parse("2030-01-01T00:00:00Z");
        PresignedPutObjectRequest presignedRequest = mock(PresignedPutObjectRequest.class);
        URL uploadUrl = URI.create("https://storage.example.com/upload").toURL();
        when(presignedRequest.url()).thenReturn(uploadUrl);
        when(presignedRequest.expiration()).thenReturn(expiresAt);
        when(presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(presignedRequest);

        final PresignedUpload result = objectStorage.createUpload(
                "files/20260820/image-id", "image/png", 1_024L
        );

        ArgumentCaptor<PutObjectPresignRequest> captor = ArgumentCaptor.forClass(PutObjectPresignRequest.class);
        verify(presigner).presignPutObject(captor.capture());
        PutObjectPresignRequest request = captor.getValue();
        assertEquals(BUCKET, request.putObjectRequest().bucket());
        assertEquals("yesulin/files/20260820/image-id", request.putObjectRequest().key());
        assertEquals("image/png", request.putObjectRequest().contentType());
        assertEquals(UPLOAD_EXPIRATION, request.signatureDuration());
        assertEquals("PUT", result.method());
        assertEquals("https://storage.example.com/upload", result.url());
        assertEquals(expiresAt, result.expiresAt());
        assertEquals("image/png", result.headers().get("Content-Type"));
    }

    @Test
    void inspectsObjectMetadataUnderTeamPrefix() {
        HeadObjectResponse response = HeadObjectResponse.builder()
                .contentType("image/jpeg")
                .contentLength(2_048L)
                .build();
        when(s3Client.headObject(any(HeadObjectRequest.class))).thenReturn(response);

        final Optional<StoredObjectMetadata> result = objectStorage.inspect("files/20260820/image-id");

        ArgumentCaptor<HeadObjectRequest> captor = ArgumentCaptor.forClass(HeadObjectRequest.class);
        verify(s3Client).headObject(captor.capture());
        assertEquals(BUCKET, captor.getValue().bucket());
        assertEquals("yesulin/files/20260820/image-id", captor.getValue().key());
        assertEquals(new StoredObjectMetadata("image/jpeg", 2_048L), result.orElseThrow());
    }

    @Test
    void returnsEmptyWhenObjectDoesNotExist() {
        S3Exception notFound = mock(S3Exception.class);
        when(notFound.statusCode()).thenReturn(404);
        when(s3Client.headObject(any(HeadObjectRequest.class))).thenThrow(notFound);

        Optional<StoredObjectMetadata> result = objectStorage.inspect("files/20260820/missing");

        assertFalse(result.isPresent());
    }

    @Test
    void createsPublicUrlWithoutPhysicalTeamPrefix() {
        String result = objectStorage.toPublicUrl("files/20260820/image-id");

        assertEquals("https://cdn.example.com/files/20260820/image-id", result);
    }

    @Test
    void createsPresignedGetForPrivateFile() throws Exception {
        PresignedGetObjectRequest presignedRequest = mock(PresignedGetObjectRequest.class);
        URL downloadUrl = URI.create("https://storage.example.com/download").toURL();
        when(presignedRequest.url()).thenReturn(downloadUrl);
        when(presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presignedRequest);

        final String result = objectStorage.createDownloadUrl("files/20260820/image-id");

        ArgumentCaptor<GetObjectPresignRequest> captor = ArgumentCaptor.forClass(GetObjectPresignRequest.class);
        verify(presigner).presignGetObject(captor.capture());
        assertEquals(BUCKET, captor.getValue().getObjectRequest().bucket());
        assertEquals("yesulin/files/20260820/image-id", captor.getValue().getObjectRequest().key());
        assertEquals(UPLOAD_EXPIRATION, captor.getValue().signatureDuration());
        assertEquals("https://storage.example.com/download", result);
    }
}
