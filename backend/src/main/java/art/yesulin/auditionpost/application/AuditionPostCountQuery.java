package art.yesulin.auditionpost.application;

import static art.yesulin.auditionpost.domain.AuditionPostStatus.PUBLISHED;

import art.yesulin.auditionpost.domain.AuditionPostCounts;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
public class AuditionPostCountQuery {

    private final AuditionPostRepository repository;
    private final AuditionPostCountCache cache;

    public AuditionPostCounts find(LocalDate today, String category) {
        // 쓰기 트랜잭션의 미커밋 결과를 공유 캐시에 넣거나 오래된 캐시를 읽지 않는다.
        if (TransactionSynchronizationManager.isActualTransactionActive()
                && !TransactionSynchronizationManager.isCurrentTransactionReadOnly()) {
            return repository.countPublishedPosts(PUBLISHED, today, category);
        }
        return cache.get(today, category, () -> repository.countPublishedPosts(PUBLISHED, today, category));
    }

    public void invalidateAfterCommit() {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            cache.invalidateAll();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                cache.invalidateAll();
            }
        });
    }
}
