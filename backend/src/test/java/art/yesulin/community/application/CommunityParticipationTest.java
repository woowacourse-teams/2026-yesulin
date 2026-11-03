package art.yesulin.community.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:community-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
class CommunityParticipationTest {

    private static final String OWNER = "a".repeat(64);
    private static final String OTHER = "b".repeat(64);
    private static final String THIRD = "c".repeat(64);

    @Autowired
    private CommunityService service;

    @Autowired
    private CommunityLikeService likes;

    @Test
    void likesAndCancelsIdempotentlyPerBrowser() {
        long id = post(OWNER).id();
        assertEquals(new LikeResult(1, true), likes.like(id, OWNER));
        assertEquals(new LikeResult(1, true), likes.like(id, OWNER));
        assertEquals(new LikeResult(2, true), likes.like(id, OTHER));
        assertEquals(new LikeResult(1, false), likes.unlike(id, OWNER));
        assertEquals(new LikeResult(1, false), likes.unlike(id, OWNER));
        assertTrue(service.post(id, OTHER).liked());
        assertFalse(service.post(id, OWNER).liked());
        assertEquals(1, service.post(id, null).likeCount());
        assertFalse(service.post(id, null).liked());
    }

    @Test
    void showsLikeStateInListAndKeepsItAfterEditing() {
        long id = post(OWNER).id();
        likes.like(id, OTHER);
        EntryResult item = service.posts(Long.MAX_VALUE, OTHER).items().getFirst();
        assertEquals(id, item.id());
        assertTrue(item.liked());
        assertFalse(item.editable());
        assertEquals(1, service.editPost(id, OWNER, "수정", "내용").likeCount());
    }

    @Test
    void rejectsMissingDeletedCommentTargetsAndInvalidIdentity() {
        long id = post(OWNER).id();
        long comment = comment(id, OTHER).id();
        assertThrows(BusinessException.class, () -> likes.like(Long.MAX_VALUE, OWNER));
        assertThrows(BusinessException.class, () -> likes.like(comment, OWNER));
        assertThrows(IllegalArgumentException.class, () -> likes.like(id, "invalid"));
        service.deletePost(id, OWNER);
        assertThrows(BusinessException.class, () -> likes.like(id, OWNER));
        assertThrows(BusinessException.class, () -> likes.unlike(id, OWNER));
    }

    @Test
    void concurrentRetriesNeverDuplicateLikesOrMakeCountNegative() throws Exception {
        long id = post(OWNER).id();
        Callable<LikeResult> first = () -> likes.like(id, OWNER);
        Callable<LikeResult> second = () -> likes.like(id, OTHER);
        run(List.of(first, first, second, second));
        assertEquals(2, service.post(id, OWNER).likeCount());
        Callable<LikeResult> cancelFirst = () -> likes.unlike(id, OWNER);
        Callable<LikeResult> cancelSecond = () -> likes.unlike(id, OTHER);
        run(List.of(cancelFirst, cancelFirst, cancelSecond, cancelSecond));
        assertEquals(0, service.post(id, OWNER).likeCount());
    }

    @Test
    void assignsStableNumbersIncludingDeletedCommentsAndPostAuthor() {
        long id = post(OWNER).id();
        assertEquals("익명1", service.post(id, null).author());
        EntryResult second = comment(id, OTHER);
        assertEquals("익명2", second.author());
        assertEquals("익명1", comment(id, OWNER).author());
        assertEquals("익명3", comment(id, THIRD).author());
        service.deleteComment(id, second.id(), OTHER);
        assertEquals("익명2", comment(id, OTHER).author());
        assertEquals("익명2", service.editComment(id, comment(id, OTHER).id(), OTHER, "수정").author());
    }

    @Test
    void numbersRestartForEachPostAndSurvivePagination() {
        long first = post(OWNER).id();
        assertEquals("익명2", comment(first, OTHER).author());
        long second = post(OTHER).id();
        assertEquals("익명2", comment(second, THIRD).author());
        assertEquals("익명3", comment(second, OWNER).author());
        for (int index = 0; index < 21; index++) {
            comment(first, THIRD);
        }
        CommunityPage page = service.comments(first, 0, null);
        assertEquals("익명3", service.comments(first, page.nextCursor(), null).items().getFirst().author());
    }

    @Test
    void concurrentNewAuthorsReceiveDistinctNumbers() throws Exception {
        long id = post(OWNER).id();
        Callable<EntryResult> first = () -> comment(id, OTHER);
        Callable<EntryResult> second = () -> comment(id, THIRD);
        try (java.util.concurrent.ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (java.util.concurrent.Future<EntryResult> result : executor.invokeAll(List.of(first, second))) {
                result.get();
            }
        }
        assertEquals(List.of("익명2", "익명3"), service.comments(id, 0, null).items().stream()
                .map(EntryResult::author).toList());
    }

    private void run(List<Callable<LikeResult>> actions) throws Exception {
        try (java.util.concurrent.ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (java.util.concurrent.Future<LikeResult> result : executor.invokeAll(actions)) {
                result.get();
            }
        }
    }

    private EntryResult post(String owner) {
        return service.createPost(owner, UUID.randomUUID(), "제목", "내용");
    }

    private EntryResult comment(long id, String owner) {
        return service.createComment(id, owner, UUID.randomUUID(), "댓글");
    }
}
