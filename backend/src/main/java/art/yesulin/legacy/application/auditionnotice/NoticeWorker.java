package art.yesulin.legacy.application.auditionnotice;

import java.time.Clock;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class NoticeWorker {

    private final NoticeStore store;
    private final NoticeAudience audience;
    private final SmsGateway gateway;
    private final NoticeSettings settings;
    private final TransactionTemplate transactions;
    private final Clock clock;

    public NoticeWorker(NoticeStore store, NoticeAudience audience, SmsGateway gateway, NoticeSettings settings,
                        PlatformTransactionManager transactionManager, Clock clock) {
        this.store = store;
        this.audience = audience;
        this.gateway = gateway;
        this.settings = settings;
        this.transactions = new TransactionTemplate(transactionManager);
        this.clock = clock;
    }

    public void tick() {
        transactions.executeWithoutResult(status -> {
            store.recover(clock.instant());
            store.expire(clock.instant().minusSeconds(30L * 86400));
        });
        if (!settings.enabled() || !settings.configured()) {
            return;
        }
        for (int i = 0; i < 10; i++) {
            Optional<NoticeStore.Delivery> claimed = transactions.execute(status -> store.claim(clock.instant()));
            if (claimed == null || claimed.isEmpty()) {
                break;
            }
            NoticeStore.Delivery delivery = claimed.get();
            NoticeStore.Batch batch = store.batch(delivery.batchId()).orElseThrow();
            boolean allowed = Boolean.TRUE.equals(transactions.execute(status -> {
                try {
                    if (store.deliveries(batch.id()).stream().noneMatch(d -> d.id().equals(delivery.id()))) {
                        return false;
                    }
                    audience.load(batch.ownerId(), NoticeScope.restore(batch.roleId(), batch.scopeKey()),
                            batch.sourceRound()).passed(delivery.submissionId());
                    return delivery.appointment().atZone(art.yesulin.legacy.domain.auditionnotice.NoticeMessage.ZONE)
                            .toInstant().isAfter(clock.instant());
                } catch (RuntimeException exception) {
                    return false;
                }
            }));
            SmsGateway.Outcome outcome = allowed
                    ? gateway.send(batch.sender(), delivery.phone(), delivery.body(), delivery.type())
                    : new SmsGateway.Outcome("FAILED", null, "ELIGIBILITY_CHANGED_NOT_SENT");
            transactions.executeWithoutResult(status -> store.outcome(delivery.id(), outcome, clock.instant()));
        }
        List<NoticeStore.Delivery> pending = transactions.execute(status -> store.pendingResults(clock.instant()));
        if (pending == null) {
            return;
        }
        for (NoticeStore.Delivery delivery : pending) {
            SmsGateway.Outcome outcome = gateway.lookup(delivery.providerId(), delivery.phone());
            transactions.executeWithoutResult(status -> store.outcome(delivery.id(), outcome, clock.instant()));
        }
    }
}
