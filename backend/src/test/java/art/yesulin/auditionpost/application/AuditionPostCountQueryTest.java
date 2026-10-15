package art.yesulin.auditionpost.application;

import static art.yesulin.auditionpost.domain.AuditionPostStatus.PUBLISHED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import art.yesulin.auditionpost.domain.AuditionPostCounts;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.auditionpost.infrastructure.cache.CaffeineAuditionPostCountCache;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class AuditionPostCountQueryTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 15);
    private static final AuditionPostCounts COUNTS = new AuditionPostCounts(100, 20);
    private final AuditionPostRepository repository = mock(AuditionPostRepository.class);
    private final AtomicLong ticks = new AtomicLong();
    private final AuditionPostCountCache cache = cache(true);
    private final AuditionPostCountQuery query = new AuditionPostCountQuery(repository, cache);

    @Test
    void reusesCountsAcrossReads() {
        when(repository.countPublishedPosts(PUBLISHED, TODAY, null)).thenReturn(COUNTS);

        assertThat(query.find(TODAY, null)).isEqualTo(COUNTS);
        assertThat(query.find(TODAY, null)).isEqualTo(COUNTS);

        verify(repository).countPublishedPosts(PUBLISHED, TODAY, null);
    }

    @Test
    void separatesDatesAndCategories() {
        when(repository.countPublishedPosts(PUBLISHED, TODAY, null)).thenReturn(COUNTS);
        when(repository.countPublishedPosts(PUBLISHED, TODAY, "연극")).thenReturn(new AuditionPostCounts(50, 10));
        when(repository.countPublishedPosts(PUBLISHED, TODAY.plusDays(1), null))
                .thenReturn(new AuditionPostCounts(100, 15));

        assertThat(query.find(TODAY, null)).isEqualTo(COUNTS);
        assertThat(query.find(TODAY, "연극").allCount()).isEqualTo(50);
        assertThat(query.find(TODAY.plusDays(1), null).openCount()).isEqualTo(15);
    }

    @Test
    void expiresFiveSecondsAfterLoadingEvenIfReadAgain() {
        when(repository.countPublishedPosts(PUBLISHED, TODAY, null))
                .thenReturn(COUNTS, new AuditionPostCounts(101, 21));
        query.find(TODAY, null);
        ticks.set(Duration.ofSeconds(4).toNanos());
        assertThat(query.find(TODAY, null)).isEqualTo(COUNTS);

        ticks.set(Duration.ofSeconds(5).toNanos());
        assertThat(query.find(TODAY, null).allCount()).isEqualTo(101);
        verify(repository, times(2)).countPublishedPosts(PUBLISHED, TODAY, null);
    }

    @Test
    void failedLoadCanBeRetried() {
        when(repository.countPublishedPosts(PUBLISHED, TODAY, null))
                .thenThrow(new IllegalStateException("DB unavailable")).thenReturn(COUNTS);

        assertThatThrownBy(() -> query.find(TODAY, null)).isInstanceOf(IllegalStateException.class);
        assertThat(query.find(TODAY, null)).isEqualTo(COUNTS);
    }

    @Test
    void disabledCacheReadsDatabaseEveryTime() {
        AuditionPostCountQuery uncached = new AuditionPostCountQuery(repository, cache(false));
        when(repository.countPublishedPosts(PUBLISHED, TODAY, null)).thenReturn(COUNTS);

        uncached.find(TODAY, null);
        uncached.find(TODAY, null);

        verify(repository, times(2)).countPublishedPosts(PUBLISHED, TODAY, null);
    }

    @Test
    void concurrentMissesLoadOnce() throws Exception {
        CountDownLatch loading = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(repository.countPublishedPosts(PUBLISHED, TODAY, null)).thenAnswer(invocation -> {
            loading.countDown();
            assertThat(release.await(5, TimeUnit.SECONDS)).isTrue();
            return COUNTS;
        });
        try (ExecutorService executor = Executors.newFixedThreadPool(8)) {
            List<Future<AuditionPostCounts>> reads = new ArrayList<>();
            try {
                for (int index = 0; index < 8; index++) {
                    reads.add(executor.submit(() -> query.find(TODAY, null)));
                }
                assertThat(loading.await(5, TimeUnit.SECONDS)).isTrue();
            } finally {
                release.countDown();
            }
            for (Future<AuditionPostCounts> read : reads) {
                assertThat(read.get(5, TimeUnit.SECONDS)).isEqualTo(COUNTS);
            }
        }
        verify(repository).countPublishedPosts(PUBLISHED, TODAY, null);
    }

    @Test
    void invalidationPreventsLateOldLoadFromRepopulatingCurrentCounts() throws Exception {
        CountDownLatch loading = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        AtomicInteger calls = new AtomicInteger();
        AuditionPostCounts updated = new AuditionPostCounts(101, 21);
        when(repository.countPublishedPosts(PUBLISHED, TODAY, null)).thenAnswer(invocation -> {
            if (calls.getAndIncrement() == 0) {
                loading.countDown();
                assertThat(release.await(5, TimeUnit.SECONDS)).isTrue();
                return COUNTS;
            }
            return updated;
        });
        try (ExecutorService executor = Executors.newSingleThreadExecutor()) {
            Future<AuditionPostCounts> old = executor.submit(() -> query.find(TODAY, null));
            try {
                assertThat(loading.await(5, TimeUnit.SECONDS)).isTrue();
                query.invalidateAfterCommit();
                assertThat(query.find(TODAY, null)).isEqualTo(updated);
            } finally {
                release.countDown();
            }
            assertThat(old.get(5, TimeUnit.SECONDS)).isEqualTo(COUNTS);
            assertThat(query.find(TODAY, null)).isEqualTo(updated);
        }
        verify(repository, times(2)).countPublishedPosts(PUBLISHED, TODAY, null);
    }

    private AuditionPostCountCache cache(boolean enabled) {
        return new CaffeineAuditionPostCountCache(
                new SimpleMeterRegistry(), enabled, Duration.ofSeconds(5), 32, ticks::get
        );
    }
}
