package art.yesulin.auditionpost.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostContent;
import art.yesulin.auditionpost.domain.AuditionPostOrigin;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.auditionpost.domain.AuditionPostStatus;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.infrastructure.persistence.QueryDslConfiguration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@DataJpaTest(showSql = false, properties = {
        "spring.datasource.url=jdbc:h2:mem:audition-post-views;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({QueryDslConfiguration.class, AuditionPostViewCountService.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class AuditionPostViewCountServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-19T00:00:00Z");

    @Autowired
    private AuditionPostViewCountService service;

    @Autowired
    private AuditionPostRepository posts;

    @BeforeEach
    void setUp() {
        service.flush();
        posts.deleteAll();
    }

    @Test
    void viewsAreWrittenOnlyWhenFlushedAndAddUpExactly() {
        long id = save("1", AuditionPostStatus.PUBLISHED);

        service.record(id);
        service.record(id);
        service.record(id);

        assertThat(viewCount(id)).isZero();
        assertThat(service.pendingCount(id)).isEqualTo(3);
        assertThat(service.flush()).isEqualTo(1);
        assertThat(viewCount(id)).isEqualTo(3);
        assertThat(service.pendingCount(id)).isZero();
    }

    @Test
    void hiddenOrMissingPostIsNotFound() {
        long hidden = save("1", AuditionPostStatus.HIDDEN);

        assertThatThrownBy(() -> service.record(hidden)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.record(Long.MAX_VALUE)).isInstanceOf(BusinessException.class);
        assertThat(service.pendingCount(hidden)).isZero();
    }

    @Test
    void viewsOfPostHiddenBeforeFlushAreDroppedInsteadOfRetried() {
        long id = save("1", AuditionPostStatus.PUBLISHED);
        service.record(id);
        AuditionPost post = posts.findById(id).orElseThrow();
        post.changeStatus(AuditionPostStatus.HIDDEN);
        posts.saveAndFlush(post);

        service.flush();

        assertThat(viewCount(id)).isZero();
        assertThat(service.pendingCount(id)).isZero();
    }

    @Test
    void concurrentRecordsWhileFlushingAreNotLost() throws Exception {
        long id = save("1", AuditionPostStatus.PUBLISHED);
        int threads = 8;
        int perThread = 250;
        AtomicBoolean running = new AtomicBoolean(true);
        try (ExecutorService executor = Executors.newFixedThreadPool(threads + 1)) {
            final Future<?> flusher = executor.submit(() -> {
                while (running.get()) {
                    service.flush();
                }
            });
            List<Future<?>> recorders = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                recorders.add(executor.submit(() -> {
                    for (int j = 0; j < perThread; j++) {
                        service.record(id);
                    }
                }));
            }
            for (Future<?> recorder : recorders) {
                recorder.get();
            }
            running.set(false);
            flusher.get();
        }
        service.flush();

        assertThat(viewCount(id)).isEqualTo(threads * perThread);
    }

    private long viewCount(long id) {
        return posts.findById(id).orElseThrow().getViewCount();
    }

    private long save(String externalId, AuditionPostStatus status) {
        AuditionPost post = new AuditionPost(
                new AuditionPostOrigin("OTR", externalId, "https://otr.co.kr/audition/?vid=" + externalId),
                content(), List.of(), List.of(), 1L, NOW);
        if (status != AuditionPostStatus.PENDING) {
            post.changeStatus(status);
        }
        return posts.saveAndFlush(post).getId();
    }

    private AuditionPostContent content() {
        return new AuditionPostContent("연극", "배우 모집", "협의", "상시", "극단",
                LocalDateTime.ofInstant(NOW, ZoneId.of("Asia/Seoul")), "<p>공고</p>");
    }
}
