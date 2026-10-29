package art.yesulin.auditionpost.domain;

import static art.yesulin.auditionpost.domain.AuditionPostStatus.HIDDEN;
import static art.yesulin.auditionpost.domain.AuditionPostStatus.PENDING;
import static art.yesulin.auditionpost.domain.AuditionPostStatus.PUBLISHED;
import static org.junit.jupiter.api.Assertions.assertEquals;

import art.yesulin.infrastructure.persistence.QueryDslConfiguration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;

@DataJpaTest(properties = {
        "spring.datasource.url=${COUNT_QUERY_TEST_DB_URL:jdbc:h2:mem:audition-count;MODE=MySQL;DB_CLOSE_DELAY=-1}",
        "spring.datasource.driver-class-name=${COUNT_QUERY_TEST_DB_DRIVER:org.h2.Driver}",
        "spring.datasource.username=${COUNT_QUERY_TEST_DB_USERNAME:sa}",
        "spring.datasource.password=${COUNT_QUERY_TEST_DB_PASSWORD:}",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(QueryDslConfiguration.class)
class AuditionPostRepositoryTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 15);
    private static final Instant NOW = Instant.parse("2026-10-15T00:00:00Z");

    @Autowired
    private AuditionPostRepository repository;

    @Test
    void returnsZeroForEmptyResult() {
        assertEquals(new AuditionPostCounts(0, 0), repository.countPublishedPosts(PUBLISHED, TODAY, null));
    }

    @Test
    void countsOnlySelectedStatusAndTreatsTodayAndUndatedPostsAsOpen() {
        saveFixture();

        assertEquals(new AuditionPostCounts(4, 3), repository.countPublishedPosts(PUBLISHED, TODAY, null));
        assertEquals(new AuditionPostCounts(4, 2), repository.countPublishedPosts(PUBLISHED, TODAY.plusDays(1), null));
        assertEquals(new AuditionPostCounts(1, 1), repository.countPublishedPosts(PENDING, TODAY, null));
        assertEquals(new AuditionPostCounts(1, 1), repository.countPublishedPosts(HIDDEN, TODAY, null));
    }

    @ParameterizedTest
    @CsvSource({"연극, 3, 2", "뮤지컬, 1, 1", "단원, 0, 0"})
    void appliesCategoryToBothCounts(String category, long allCount, long openCount) {
        saveFixture();

        assertEquals(new AuditionPostCounts(allCount, openCount),
                repository.countPublishedPosts(PUBLISHED, TODAY, category));
    }

    @Test
    void returnsZeroOpenCountWhenAllMatchingPostsAreClosed() {
        savePost("퍼포먼스", TODAY.minusDays(1).toString(), PUBLISHED);

        assertEquals(new AuditionPostCounts(1, 0), repository.countPublishedPosts(PUBLISHED, TODAY, "퍼포먼스"));
    }

    @Test
    void sortsDeadlineAcrossPagesWithUndatedAndClosedPostsAtTheEnd() {
        final AuditionPost olderClosed = savePost("연극", TODAY.minusDays(3).toString(), PUBLISHED);
        final AuditionPost recentClosed = savePost("연극", TODAY.minusDays(1).toString(), PUBLISHED);
        final AuditionPost undated = savePost("연극", "상시", PUBLISHED);
        AuditionPost tomorrow = savePost("연극", TODAY.plusDays(1).toString(), PUBLISHED);
        AuditionPost today = savePost("연극", TODAY.toString(), PUBLISHED);
        savePost("연극", TODAY.toString(), HIDDEN);
        savePost("연극", TODAY.toString(), PENDING);

        assertEquals(List.of(today.getId(), tomorrow.getId()), deadlineIds(0, 2, true, null));
        assertEquals(List.of(undated.getId(), recentClosed.getId()), deadlineIds(1, 2, true, null));
        assertEquals(List.of(olderClosed.getId()), deadlineIds(2, 2, true, null));
    }

    @Test
    void appliesOpenStatusAndCategoryBeforeDeadlinePagination() {
        savePost("연극", TODAY.minusDays(1).toString(), PUBLISHED);
        savePost("뮤지컬", TODAY.toString(), PUBLISHED);
        AuditionPost undated = savePost("연극", "채용 시 마감", PUBLISHED);
        AuditionPost tomorrow = savePost("연극", TODAY.plusDays(1).toString(), PUBLISHED);

        assertEquals(List.of(tomorrow.getId()), deadlineIds(0, 1, false, "연극"));
        assertEquals(List.of(undated.getId()), deadlineIds(1, 1, false, "연극"));
        assertEquals(List.of(), deadlineIds(2, 1, false, "연극"));
    }

    @Test
    void breaksSameDeadlineTiesByPostedAtThenId() {
        LocalDateTime postedAt = TODAY.atStartOfDay();
        AuditionPost first = savePost("연극", TODAY.toString(), PUBLISHED, postedAt);
        AuditionPost second = savePost("연극", TODAY.toString(), PUBLISHED, postedAt);
        AuditionPost older = savePost("연극", TODAY.toString(), PUBLISHED, postedAt.minusHours(1));

        assertEquals(List.of(second.getId(), first.getId(), older.getId()), deadlineIds(0, 12, false, null));
    }

    @Test
    void keepsLatestOrderIndependentOfDeadline() {
        LocalDateTime postedAt = TODAY.atStartOfDay();
        AuditionPost soon = savePost("연극", TODAY.toString(), PUBLISHED, postedAt.minusDays(1));
        AuditionPost later = savePost("연극", TODAY.plusDays(10).toString(), PUBLISHED, postedAt);

        List<Long> latest = repository.findPublished(PUBLISHED, TODAY, false, null, PageRequest.of(0, 12))
                .stream().map(AuditionPost::getId).toList();

        assertEquals(List.of(later.getId(), soon.getId()), latest);
        assertEquals(List.of(soon.getId(), later.getId()), deadlineIds(0, 12, false, null));
    }

    private List<Long> deadlineIds(int page, int size, boolean includeClosed, String category) {
        return repository.findPublishedByDeadline(PUBLISHED, TODAY, includeClosed, category, PageRequest.of(page, size))
                .stream().map(AuditionPost::getId).toList();
    }

    private void saveFixture() {
        savePost("연극", "상시", PUBLISHED);
        savePost("연극", TODAY.toString(), PUBLISHED);
        savePost("연극", TODAY.minusDays(1).toString(), PUBLISHED);
        savePost("뮤지컬", TODAY.plusDays(1).toString(), PUBLISHED);
        savePost("연극", "상시", PENDING);
        savePost("연극", "상시", HIDDEN);
    }

    private AuditionPost savePost(String category, String deadline, AuditionPostStatus status) {
        return savePost(category, deadline, status, null);
    }

    private AuditionPost savePost(
            String category, String deadline, AuditionPostStatus status, LocalDateTime postedAt
    ) {
        AuditionPostContent content = new AuditionPostContent(category, "공고", "", deadline, "", postedAt, "");
        AuditionPost post = AuditionPost.write(content, List.of(), List.of(), 1L, NOW);
        post.changeStatus(status);
        return repository.saveAndFlush(post);
    }
}
