package art.yesulin.auditionpost.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostContent;
import art.yesulin.auditionpost.domain.AuditionPostOrigin;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.auditionpost.domain.AuditionPostStatus;
import art.yesulin.auditionpost.domain.notice.Notice;
import art.yesulin.auditionpost.domain.notice.NoticeRepository;
import art.yesulin.auditionpost.infrastructure.persistence.QueryDslOpenChatVisitQuery;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.infrastructure.persistence.QueryDslConfiguration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@DataJpaTest(showSql = false, properties = {
        "spring.datasource.url=jdbc:h2:mem:openchat-counts;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({QueryDslConfiguration.class, QueryDslOpenChatVisitQuery.class, OpenChatVisitService.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class OpenChatVisitServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-22T00:00:00Z");

    @Autowired
    private OpenChatVisitService service;

    @Autowired
    private AuditionPostRepository posts;

    @Autowired
    private NoticeRepository notices;

    @BeforeEach
    void setUp() {
        posts.deleteAll();
        notices.deleteAllInBatch();
    }

    @Test
    void incrementsOnlyAggregateCountsForPublishedAndHiddenPosts() {
        long first = saveOtr("123", AuditionPostStatus.PUBLISHED);
        long second = saveOtr("124", AuditionPostStatus.HIDDEN);
        service.recordPost(first);
        service.recordPost(first);
        service.recordPost(second);

        assertThat(service.findForAdmin(0).posts()).extracting("visitCount").containsExactly(1L, 2L);
    }

    @Test
    void pendingOtrIsIncludedButPrivateDirectAndMissingPostsAreRejected() {
        long id = saveOtr("123", AuditionPostStatus.PENDING);
        AuditionPost direct = posts.saveAndFlush(AuditionPost.write(content(), List.of(), List.of(), 1L, NOW));

        service.recordPost(id);

        assertThat(posts.findById(id).orElseThrow().getOpenChatVisitCount()).isEqualTo(1);
        assertThatThrownBy(() -> service.recordPost(direct.getId())).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.recordPost(Long.MAX_VALUE)).isInstanceOf(BusinessException.class);
    }

    @Test
    void fallbackCountIsAddedToLaterImportedPostWithoutVisitorRecords() {
        notices.saveAndFlush(Notice.pending("OTR", "123"));
        service.recordOtr("123");
        long id = saveOtr("123", AuditionPostStatus.PUBLISHED);
        service.recordPost(id);

        assertThat(service.findForAdmin(0).posts().getFirst().visitCount()).isEqualTo(2);
        assertThat(notices.findBySourceAndExternalId("OTR", "123").orElseThrow().getOpenChatVisitCount())
                .isEqualTo(1);
    }

    @Test
    void concurrentIncrementsDoNotLoseCounts() throws Exception {
        long id = saveOtr("123", AuditionPostStatus.PUBLISHED);
        try (ExecutorService executor = Executors.newFixedThreadPool(8)) {
            List<Callable<Void>> tasks = IntStream.range(0, 8)
                    .mapToObj(index -> (Callable<Void>) () -> {
                        service.recordPost(id);
                        return null;
                    }).toList();
            for (Future<Void> result : executor.invokeAll(tasks)) {
                result.get();
            }
        }
        assertThat(posts.findById(id).orElseThrow().getOpenChatVisitCount()).isEqualTo(8);
    }

    @Test
    void changingOtherFieldsDoesNotOverwriteCountsReadBeforeTheVisit() {
        long id = saveOtr("123", AuditionPostStatus.PUBLISHED);
        AuditionPost stale = posts.findById(id).orElseThrow();
        service.recordPost(id);
        stale.changeStatus(AuditionPostStatus.HIDDEN);
        posts.saveAndFlush(stale);

        assertThat(posts.findById(id).orElseThrow().getOpenChatVisitCount()).isEqualTo(1);
    }

    @Test
    void pagesIncludeZeroVisitsAndNewestPostsFirst() {
        for (int index = 0; index < 21; index++) {
            saveOtr(Integer.toString(index + 1), AuditionPostStatus.PUBLISHED);
        }
        AdminOpenChatVisitsResult first = service.findForAdmin(0);

        assertThat(first.totalElements()).isEqualTo(21);
        assertThat(first.totalPages()).isEqualTo(2);
        assertThat(first.posts()).hasSize(20).allMatch(post -> post.visitCount() == 0);
        assertThat(first.posts().getFirst().postId()).isGreaterThan(first.posts().getLast().postId());
        assertThat(first.posts().getFirst().postedAt()).isEqualTo(NOW);
        assertThat(service.findForAdmin(1).posts()).hasSize(1);
        assertThat(service.findForAdmin(2).posts()).isEmpty();
    }

    @Test
    void rejectsInvalidIdentifiersAndPage() {
        assertThatThrownBy(() -> service.recordOtr("../123")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.recordOtr("123")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.findForAdmin(-1)).isInstanceOf(IllegalArgumentException.class);
    }

    private long saveOtr(String externalId, AuditionPostStatus status) {
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
