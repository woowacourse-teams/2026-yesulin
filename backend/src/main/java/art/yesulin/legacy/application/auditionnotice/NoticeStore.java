package art.yesulin.legacy.application.auditionnotice;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NoticeStore {

    void lock();

    Optional<Batch> byKey(long ownerId, UUID key);

    Optional<Batch> batch(UUID id);

    List<Batch> batches(long ownerId, NoticeScope scope, int round);

    List<HistoryItem> history(long ownerId, NoticeScope scope, int round);

    List<Delivery> deliveries(UUID batchId);

    void insert(Batch batch, List<Delivery> deliveries);

    int reserve(LocalDate day, int count, int limit);

    Optional<Draft> draft(long ownerId, NoticeScope scope, int round);

    void saveDraft(long ownerId, NoticeScope scope, int round, Draft draft);

    void deleteDraft(long ownerId, NoticeScope scope, int round);

    Optional<Delivery> claim(Instant now);

    void outcome(UUID id, SmsGateway.Outcome outcome, Instant now);

    List<Delivery> pendingResults(Instant now);

    void recover(Instant now);

    void eraseSubmission(UUID submissionId);

    void expire(Instant before);

    void markRetried(List<UUID> ids);

    record Batch(UUID id, long ownerId, long roleId, int sourceRound, Long sourceStageId, Long targetStageId,
                 UUID idempotencyKey, String fingerprint, String sender, Instant createdAt, UUID retryOf,
                 BigDecimal estimatedCost, int count, String scopeKey) {
    }

    record Delivery(UUID id, UUID batchId, UUID submissionId, String name, String phone,
                    LocalDateTime appointment, String body, String type, BigDecimal price,
                    String status, String providerId, String code, Instant updatedAt) {
    }

    record Draft(long version, String payload, Instant updatedAt) {
    }

    record HistoryItem(Batch batch, String firstRecipientName, int retainedCount, int deliveredCount,
                       int failedCount, int pendingCount, int unknownCount, String messageType) {
    }
}
