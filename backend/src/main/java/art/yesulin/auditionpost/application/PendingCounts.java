package art.yesulin.auditionpost.application;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.BiConsumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 요청마다 같은 행을 UPDATE하지 않도록 대상별 증가분을 메모리에 모았다가 한 번에 더한다.
 * 알림 직후 한 공고에 방문이 몰리면 같은 행 잠금을 기다리며 DB 커넥션이 바닥나기 때문이다.
 * 서버가 비정상 종료되면 마지막 기록 이후의 증가분은 잃는다.
 */
public final class PendingCounts<K> {

    private static final Logger LOGGER = LoggerFactory.getLogger(PendingCounts.class);

    private final String name;
    private final Map<K, Long> pending = new ConcurrentHashMap<>();

    public PendingCounts(String name) {
        this.name = name;
    }

    public void increase(K key) {
        pending.merge(key, 1L, Long::sum);
    }

    public long get(K key) {
        return pending.getOrDefault(key, 0L);
    }

    /** 모아 둔 증가분을 기록하고 기록한 대상 수를 돌려준다. 실패한 대상은 다음 기록으로 넘긴다. */
    public int flush(BiConsumer<K, Long> writer) {
        int flushed = 0;
        for (K key : List.copyOf(pending.keySet())) {
            Long amount = pending.remove(key);
            if (amount == null) {
                continue;
            }
            try {
                writer.accept(key, amount);
                flushed++;
            } catch (RuntimeException exception) {
                pending.merge(key, amount, Long::sum);
                LOGGER.warn("Failed to flush {} {} of {}", amount, name, key, exception);
            }
        }
        return flushed;
    }
}
