package art.yesulin.actor.application.page;

import art.yesulin.actor.domain.photolibrary.PhotoPublicCopyDeletion;
import art.yesulin.actor.domain.photolibrary.PhotoPublicCopyDeletionRepository;
import art.yesulin.actor.domain.photolibrary.PhotoPublicCopyRules;
import art.yesulin.file.application.storage.ObjectStorage;
import art.yesulin.file.application.storage.PresignedUpload;
import art.yesulin.file.application.storage.PublicObjectCache;
import art.yesulin.file.application.storage.StoredObjectContent;
import art.yesulin.file.application.storage.StoredObjectMetadata;
import java.time.Clock;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 배우 페이지 공개 사진 사본을 저장소에 둔다. 공개 경로({@code public/files/actor-pages/})는 공연 포스터와 같은 {@code files}
 * CDN 동작으로 제공한다. 사본은 비공개 전환·잠금·사진 비공개·삭제로 지워지는 객체라 오래 캐시하지 않고, 지울 때 CDN 캐시
 * 무효화도 요청한다. 지우지 못한 사본은 공개 주소로 계속 열리므로 정리 작업이 다시 지우도록 키를 남긴다.
 */
@Slf4j
@Component
public class PublicPhotoCopyStorage {

    /** 사본을 지운 뒤 무효화가 없어도 늦어도 10분 안에 CDN에서 사라지게 한다. */
    public static final String CACHE_CONTROL = "public, max-age=600";

    private static final DateTimeFormatter KEY_DATE = DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC);
    private static final String KEY_FORMAT = "public/files/actor-pages/%s/%s";

    private final ObjectStorage storage;
    private final PublicObjectCache cache;
    private final PhotoPublicCopyDeletionRepository deletions;
    private final TransactionTemplate retryRecords;
    private final Clock clock;

    public PublicPhotoCopyStorage(
            ObjectStorage storage,
            PublicObjectCache cache,
            PhotoPublicCopyDeletionRepository deletions,
            PlatformTransactionManager transactionManager,
            Clock clock
    ) {
        this.storage = storage;
        this.cache = cache;
        this.deletions = deletions;
        this.retryRecords = new TransactionTemplate(transactionManager);
        this.retryRecords.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.clock = clock;
    }

    public PreparedCopy prepare(long size) {
        String objectKey = KEY_FORMAT.formatted(KEY_DATE.format(clock.instant()), UUID.randomUUID());
        return new PreparedCopy(objectKey, storage.createUpload(objectKey, PhotoPublicCopyRules.CONTENT_TYPE, size));
    }

    /**
     * 브라우저가 약속한 크기의 JPEG를 올렸는지 확인하고 짧은 캐시 설정을 붙인다.
     *
     * @return 아직 올라오지 않았거나 형식·크기·내용이 다르면 false
     */
    public boolean confirm(String objectKey, long size) {
        Optional<StoredObjectMetadata> stored = storage.inspect(objectKey);
        if (stored.isEmpty() || stored.get().size() != size) {
            return false;
        }
        return applyHeaders(objectKey, stored.get());
    }

    /** 이미 확정한 사본을 같은 주소로 다시 올렸을 때 캐시 설정을 다시 붙인다. */
    public boolean reconfirm(String objectKey) {
        return storage.inspect(objectKey).map(stored -> applyHeaders(objectKey, stored)).orElse(false);
    }

    public String publicUrl(String objectKey) {
        return storage.toPublicUrl(objectKey);
    }

    /** 더 쓰지 않는 사본을 커밋 뒤 지우고 CDN 캐시 무효화를 요청한다. 지우지 못한 사본은 다시 지우도록 남긴다. 롤백되면 그대로 둔다. */
    public void discardAfterCommit(Collection<String> objectKeys) {
        if (objectKeys.isEmpty()) {
            return;
        }
        List<String> targets = List.copyOf(objectKeys);
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            discard(targets);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                discard(targets);
            }
        });
    }

    /**
     * 사본을 지우고, 지운 사본만 CDN 캐시 무효화를 요청한다. 지우지 못해도 요청을 실패시키지 않는다.
     *
     * @return 지운 사본 키
     */
    public List<String> delete(Collection<String> objectKeys) {
        List<String> deleted = objectKeys.stream().filter(this::tryDelete).toList();
        cache.evict(deleted);
        return deleted;
    }

    /** 지우지 못해도 요청을 실패시키지 않는다. 정리 작업이 다시 시도할 수 있게 결과를 알려 준다. */
    public boolean tryDelete(String objectKey) {
        try {
            storage.delete(objectKey);
            return true;
        } catch (RuntimeException exception) {
            log.warn("배우 페이지 사진 사본 삭제 실패: {} {}", objectKey, exception.getClass().getSimpleName());
            return false;
        }
    }

    private boolean applyHeaders(String objectKey, StoredObjectMetadata stored) {
        if (!PhotoPublicCopyRules.isAcceptedType(stored.contentType())) {
            return false;
        }
        Optional<StoredObjectContent> content = storage.read(objectKey);
        if (content.isEmpty() || !PhotoPublicCopyRules.startsLikeJpeg(content.get().bytes())) {
            return false;
        }
        storage.replaceHeaders(objectKey, PhotoPublicCopyRules.CONTENT_TYPE, null, CACHE_CONTROL);
        return true;
    }

    private void discard(List<String> objectKeys) {
        List<String> deleted = delete(objectKeys);
        List<String> failed = objectKeys.stream().filter(objectKey -> !deleted.contains(objectKey)).toList();
        if (!failed.isEmpty()) {
            rememberForRetry(failed);
        }
    }

    /** 커밋이 끝난 뒤라 원래 트랜잭션에 쓸 수 없어 새 트랜잭션으로 남긴다. 그마저 실패하면 키를 오류 로그로 남긴다. */
    private void rememberForRetry(List<String> objectKeys) {
        try {
            retryRecords.executeWithoutResult(status -> objectKeys.stream()
                    .filter(objectKey -> !deletions.existsByObjectKey(objectKey))
                    .forEach(objectKey -> deletions.save(new PhotoPublicCopyDeletion(objectKey, clock.instant()))));
        } catch (RuntimeException exception) {
            log.error("배우 페이지 사진 사본 삭제 재시도 기록 실패: {}", objectKeys, exception);
        }
    }

    public record PreparedCopy(String objectKey, PresignedUpload upload) {
    }
}
