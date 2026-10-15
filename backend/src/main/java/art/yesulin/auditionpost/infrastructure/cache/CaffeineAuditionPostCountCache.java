package art.yesulin.auditionpost.infrastructure.cache;

import art.yesulin.auditionpost.application.AuditionPostCountCache;
import art.yesulin.auditionpost.domain.AuditionPostCounts;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.Ticker;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.binder.cache.CaffeineCacheMetrics;
import java.time.Duration;
import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CaffeineAuditionPostCountCache implements AuditionPostCountCache {

    private final Cache<Key, AuditionPostCounts> cache;
    private final AtomicLong generation = new AtomicLong();
    private final boolean enabled;

    @Autowired
    public CaffeineAuditionPostCountCache(
            MeterRegistry registry,
            @Value("${yesulin.audition-post.count-cache.enabled:true}") boolean enabled,
            @Value("${yesulin.audition-post.count-cache.ttl:PT5S}") Duration ttl,
            @Value("${yesulin.audition-post.count-cache.maximum-size:32}") long maximumSize
    ) {
        this(registry, enabled, ttl, maximumSize, Ticker.systemTicker());
    }

    public CaffeineAuditionPostCountCache(
            MeterRegistry registry, boolean enabled, Duration ttl, long maximumSize, Ticker ticker
    ) {
        if (ttl.isZero() || ttl.isNegative() || maximumSize < 1) {
            throw new IllegalArgumentException("COUNT 캐시는 양수 만료 시간과 저장 개수를 사용해야 합니다.");
        }
        this.enabled = enabled;
        this.cache = Caffeine.newBuilder().expireAfterWrite(ttl).maximumSize(maximumSize)
                .ticker(ticker).recordStats().build();
        CaffeineCacheMetrics.monitor(registry, cache, "auditionPostCounts");
    }

    @Override
    public AuditionPostCounts get(LocalDate today, String category, Supplier<AuditionPostCounts> loader) {
        if (!enabled) {
            return loader.get();
        }
        return cache.get(new Key(today, category, generation.get()), key -> loader.get());
    }

    @Override
    public void invalidateAll() {
        // 커밋 전 시작한 로딩이 나중에 끝나도 다음 요청은 그 결과를 재사용하지 않는다.
        // 이전 세대의 항목은 만료·크기 제한으로 제거해 로딩 중인 키의 잠금을 기다리지 않는다.
        generation.incrementAndGet();
    }

    private record Key(LocalDate today, String category, long generation) {
    }
}
