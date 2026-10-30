package art.yesulin.infrastructure.storage;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.Delete;
import software.amazon.awssdk.services.s3.model.DeleteObjectsRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectsResponse;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.ObjectIdentifier;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

/** 기능과 무관한 비공개 S3 객체 접근. 업무 경로·결과 형식·소유권은 호출한 기능이 결정한다. */
@RequiredArgsConstructor
public class S3PrivateObjects {

    private static final ScheduledExecutorService READ_TIMEOUTS = Executors.newSingleThreadScheduledExecutor(
            Thread.ofPlatform().daemon().name("s3-read-timeout").factory());

    private final S3Client client;
    private final S3Presigner presigner;
    private final String bucket;
    private final String keyPrefix;
    private final Duration uploadExpiration;
    private final Duration downloadExpiration;

    public Upload createOnce(String logicalKey, String contentType, long size) {
        PutObjectRequest put = PutObjectRequest.builder().bucket(bucket).key(physicalKey(logicalKey))
                .contentType(contentType).contentLength(size).ifNoneMatch("*").build();
        PresignedPutObjectRequest signed = presigner.presignPutObject(PutObjectPresignRequest.builder()
                .signatureDuration(uploadExpiration).putObjectRequest(put).build());
        return new Upload(signed.url().toString(), "PUT", signed.expiration(),
                Map.of("Content-Type", contentType, "If-None-Match", "*"));
    }

    public Optional<Metadata> inspect(String logicalKey) {
        try {
            HeadObjectResponse response = client.headObject(HeadObjectRequest.builder()
                    .bucket(bucket).key(physicalKey(logicalKey)).build());
            return Optional.of(new Metadata(response.contentType(), response.contentLength()));
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) {
                return Optional.empty();
            }
            throw exception;
        }
    }

    public byte[] readPrefix(String logicalKey, int length) {
        GetObjectRequest request = GetObjectRequest.builder().bucket(bucket).key(physicalKey(logicalKey))
                .range("bytes=0-" + (length - 1)).build();
        return read(request, length, false);
    }

    public Optional<byte[]> readIfPresent(String logicalKey, int maxBytes) {
        String key = physicalKey(logicalKey);
        ListObjectsV2Response listing = client.listObjectsV2(ListObjectsV2Request.builder()
                .bucket(bucket).prefix(key).maxKeys(1)
                .overrideConfiguration(config -> config.apiCallTimeout(Duration.ofSeconds(30))).build());
        if (listing.contents().stream().noneMatch(object -> object.key().equals(key))) {
            return Optional.empty();
        }
        GetObjectRequest request = GetObjectRequest.builder().bucket(bucket).key(key)
                .overrideConfiguration(config -> config.apiCallTimeout(Duration.ofSeconds(30))).build();
        return Optional.of(read(request, maxBytes, true));
    }

    /**
     * 접두사 아래 객체를 모두 지운다. 지운 개수를 돌려준다. 일괄 삭제는 일부 객체가 실패해도 성공 응답을 주므로 실패 목록을 확인해
     * 하나라도 남았으면 예외를 던진다. 호출한 쪽은 지운 것으로 기록하지 않고 다음에 다시 지운다.
     */
    public int deleteAll(String logicalPrefix) {
        String prefix = physicalKey(logicalPrefix);
        int deleted = 0;
        String token = null;
        do {
            ListObjectsV2Response listing = client.listObjectsV2(ListObjectsV2Request.builder()
                    .bucket(bucket).prefix(prefix).continuationToken(token).build());
            List<ObjectIdentifier> keys = listing.contents().stream()
                    .map(object -> ObjectIdentifier.builder().key(object.key()).build())
                    .toList();
            if (!keys.isEmpty()) {
                DeleteObjectsResponse response = client.deleteObjects(DeleteObjectsRequest.builder().bucket(bucket)
                        .delete(Delete.builder().objects(keys).quiet(true).build()).build());
                if (response.hasErrors() && !response.errors().isEmpty()) {
                    throw new IllegalStateException("저장소 객체 %d개를 지우지 못했습니다. 첫 오류: %s"
                            .formatted(response.errors().size(), response.errors().getFirst().code()));
                }
                deleted += keys.size();
            }
            token = Boolean.TRUE.equals(listing.isTruncated()) ? listing.nextContinuationToken() : null;
        } while (token != null);
        return deleted;
    }

    public String downloadUrl(String logicalKey) {
        GetObjectRequest get = GetObjectRequest.builder().bucket(bucket).key(physicalKey(logicalKey))
                .responseCacheControl("no-store").build();
        return presigner.presignGetObject(GetObjectPresignRequest.builder()
                .signatureDuration(downloadExpiration).getObjectRequest(get).build()).url().toString();
    }

    public String physicalKey(String logicalKey) {
        if (logicalKey.startsWith("/") || logicalKey.contains("..") || logicalKey.contains("\\")) {
            throw new IllegalArgumentException("저장소 키가 올바르지 않습니다.");
        }
        return keyPrefix + "/" + logicalKey;
    }

    public void downloadTo(String logicalKey, Path target, long expectedBytes) throws IOException {
        HeadObjectResponse head = client.headObject(HeadObjectRequest.builder().bucket(bucket)
                .key(physicalKey(logicalKey)).overrideConfiguration(config -> config
                        .apiCallTimeout(Duration.ofSeconds(30))).build());
        if (head.contentLength() != expectedBytes) {
            throw new IOException("Object size mismatch");
        }
        GetObjectRequest request = GetObjectRequest.builder().bucket(bucket).key(physicalKey(logicalKey))
                .ifMatch(head.eTag()).overrideConfiguration(config -> config
                        .apiCallTimeout(Duration.ofSeconds(30))).build();
        try (ResponseInputStream<GetObjectResponse> input = client.getObject(request);
                OutputStream output = Files.newOutputStream(target)) {
            ScheduledFuture<Object> timeout = abortAfter(input);
            try {
                copy(input, output, expectedBytes);
            } finally {
                timeout.cancel(false);
            }
        }
    }

    private void copy(InputStream input, OutputStream output, long expectedBytes) throws IOException {
        byte[] buffer = new byte[64 * 1024];
        long size = 0;
        int read;
        while ((read = input.read(buffer)) != -1) {
            size += read;
            if (size > expectedBytes) {
                throw new IOException("Object exceeds size limit");
            }
            output.write(buffer, 0, read);
        }
        if (size != expectedBytes) {
            throw new IOException("Object size mismatch");
        }
    }

    public boolean uploadFileOnce(String logicalKey, Path source, String contentType) {
        try {
            client.putObject(PutObjectRequest.builder().bucket(bucket).key(physicalKey(logicalKey))
                    .contentType(contentType).cacheControl("no-store").serverSideEncryption("AES256")
                    .ifNoneMatch("*")
                    .overrideConfiguration(config -> config.apiCallTimeout(Duration.ofSeconds(30))).build(),
                    RequestBody.fromFile(source));
            return true;
        } catch (S3Exception exception) {
            if (exception.statusCode() == 412) {
                return false;
            }
            throw exception;
        }
    }

    private ScheduledFuture<Object> abortAfter(ResponseInputStream<GetObjectResponse> stream) {
        return READ_TIMEOUTS.schedule(() -> {
            stream.abort();
            return null;
        }, 30, TimeUnit.SECONDS);
    }

    private byte[] read(GetObjectRequest request, int maxBytes, boolean rejectLarger) {
        try (ResponseInputStream<GetObjectResponse> stream = client.getObject(request)) {
            ScheduledFuture<Object> timeout = abortAfter(stream);
            byte[] bytes;
            try {
                bytes = stream.readNBytes(maxBytes + (rejectLarger ? 1 : 0));
            } finally {
                timeout.cancel(false);
            }
            if (rejectLarger && bytes.length > maxBytes) {
                throw new IllegalStateException("저장소 객체 읽기 상한을 넘었습니다.");
            }
            return bytes;
        } catch (IOException exception) {
            throw new IllegalStateException("저장소 객체를 읽지 못했습니다.", exception);
        }
    }

    public record Upload(String url, String method, Instant expiresAt, Map<String, String> headers) {
    }

    public record Metadata(String contentType, long size) {
    }
}
