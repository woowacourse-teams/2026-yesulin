package art.yesulin.feedback.application;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * 같은 접속 주소에서 짧은 시간에 의견을 너무 많이 보내 슬랙 채널이 도배되지 않게 막는다.
 * 서버 메모리에만 두고 저장하지 않는다. 서버마다 따로 세며 재시작하면 초기화된다.
 */
@Component
public class FeedbackRateLimiter {

    static final int LIMIT = 5;
    static final Duration WINDOW = Duration.ofMinutes(10);
    private static final int MAX_KEYS = 10_000;

    private final Clock clock;
    private final Map<String, Deque<Instant>> history = new ConcurrentHashMap<>();

    @Autowired
    public FeedbackRateLimiter(Clock clock) {
        this.clock = clock;
    }

    public boolean tryAcquire(String key) {
        Instant now = Instant.now(clock);
        forgetAllWhenFull();
        Deque<Instant> sent = history.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (sent) {
            return record(sent, now);
        }
    }

    private boolean record(Deque<Instant> sent, Instant now) {
        while (!sent.isEmpty() && !sent.peekFirst().isAfter(now.minus(WINDOW))) {
            sent.pollFirst();
        }
        if (sent.size() >= LIMIT) {
            return false;
        }
        sent.addLast(now);
        return true;
    }

    private void forgetAllWhenFull() {
        if (history.size() > MAX_KEYS) {
            history.clear();
        }
    }
}
