package art.yesulin.file.infrastructure.storage.cloudfront;

import art.yesulin.file.application.storage.ObjectStorage;
import art.yesulin.file.application.storage.PublicObjectCache;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cloudfront.CloudFrontClient;

/**
 * 배포 ID를 넣은 환경에서만 CloudFront 무효화를 요청한다. 비워 두면 공개 객체를 지워도 캐시는 객체의 캐시 기간이 지나야 사라진다.
 * 무효화 권한은 서버 실행 역할에 {@code cloudfront:CreateInvalidation}이 있어야 한다.
 */
@Configuration(proxyBeanMethods = false)
public class CloudFrontCacheConfiguration {

    @Bean
    PublicObjectCache publicObjectCache(
            @Value("${yesulin.storage.cloudfront.distribution-id:}") String distributionId,
            ObjectProvider<ObjectStorage> storage
    ) {
        String id = distributionId.trim();
        ObjectStorage objectStorage = storage.getIfAvailable();
        if (id.isEmpty() || objectStorage == null) {
            return objectKeys -> {
            };
        }
        CloudFrontClient client = CloudFrontClient.builder()
                .region(Region.AWS_GLOBAL)
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .build();
        return new CloudFrontPublicObjectCache(client, id, objectStorage);
    }
}
