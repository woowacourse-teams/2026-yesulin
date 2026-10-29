package art.yesulin.file.infrastructure.storage.cloudfront;

import art.yesulin.file.application.storage.ObjectStorage;
import art.yesulin.file.application.storage.PublicObjectCache;
import java.net.URI;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.services.cloudfront.CloudFrontClient;

/** CloudFront 배포에 무효화를 요청한다. 요청은 커밋 뒤에 보내며, 실패해도 객체의 짧은 캐시 기간이 지나면 사라진다. */
@Slf4j
public class CloudFrontPublicObjectCache implements PublicObjectCache, AutoCloseable {

    private final CloudFrontClient client;
    private final String distributionId;
    private final ObjectStorage storage;

    public CloudFrontPublicObjectCache(CloudFrontClient client, String distributionId, ObjectStorage storage) {
        this.client = client;
        this.distributionId = distributionId;
        this.storage = storage;
    }

    @Override
    public void evict(Collection<String> objectKeys) {
        List<String> paths = objectKeys.stream().flatMap(this::pathsOf).distinct().toList();
        if (paths.isEmpty()) {
            return;
        }
        try {
            client.createInvalidation(request -> request
                    .distributionId(distributionId)
                    .invalidationBatch(batch -> batch
                            .callerReference(UUID.randomUUID().toString())
                            .paths(items -> items.quantity(paths.size()).items(paths))));
        } catch (RuntimeException exception) {
            log.warn("CDN 캐시 무효화 실패: {} {}", exception.getClass().getSimpleName(), exception.getMessage());
        }
    }

    /**
     * 보는 사람이 요청하는 경로({@code /dev/files/...})와 CDN 함수가 환경 접두사를 뗀 경로({@code /files/...})를 함께 지운다.
     * 뷰어 요청 함수가 바꾼 경로로 캐시가 저장되므로 앞의 경로만으로는 지워지지 않을 수 있다.
     */
    private Stream<String> pathsOf(String objectKey) {
        String viewerPath = URI.create(storage.toPublicUrl(objectKey)).getRawPath();
        String functionPath = "/" + objectKey.replaceFirst("^/*public/", "");
        return Stream.of(viewerPath, functionPath);
    }

    @Override
    public void close() {
        client.close();
    }
}
