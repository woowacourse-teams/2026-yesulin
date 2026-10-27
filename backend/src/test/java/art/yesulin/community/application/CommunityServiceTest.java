package art.yesulin.community.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.community.domain.CommunityEntryRepository;
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
class CommunityServiceTest {

    private static final String OWNER = "a".repeat(64);
    private static final String OTHER = "b".repeat(64);

    @Autowired
    private CommunityService service;

    @Autowired
    private CommunityEntryRepository repository;

    @Test
    void publishesWithoutAccountAndKeepsOwnershipPrivate() {
        EntryResult post = create();
        assertEquals("제목", service.post(post.id(), null).title());
        assertEquals("본문", service.posts(Long.MAX_VALUE).items().getFirst().body());
        assertFalse(service.post(post.id(), null).editable());
        assertFalse(service.post(post.id(), OTHER).editable());
        assertTrue(service.post(post.id(), OWNER).editable());
        assertThrows(BusinessException.class, () -> service.editPost(post.id(), OTHER, "변경", "본문"));
    }

    @Test
    void createsOnlyOnceForConcurrentRetries() throws Exception {
        UUID requestId = UUID.randomUUID();
        Callable<Long> write = () -> service.createPost(OWNER, requestId, "제목", "본문").id();
        try (java.util.concurrent.ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<java.util.concurrent.Future<Long>> results = executor.invokeAll(List.of(write, write, write));
            assertEquals(results.get(0).get(), results.get(1).get());
            assertEquals(results.get(1).get(), results.get(2).get());
        }
        assertThrows(BusinessException.class, () -> service.createPost(OTHER, requestId, "제목", "본문"));
        assertThrows(BusinessException.class, () -> service.createPost(OWNER, requestId, "변경", "본문"));
    }

    @Test
    void countsCommentsOnceAndHidesThemWithDeletedPost() {
        EntryResult post = create();
        UUID requestId = UUID.randomUUID();
        EntryResult comment = service.createComment(post.id(), OTHER, requestId, "댓글");
        assertEquals(comment.id(), service.createComment(post.id(), OTHER, requestId, "댓글").id());
        assertEquals(1, service.post(post.id(), null).commentCount());
        assertThrows(BusinessException.class, () -> service.deleteComment(post.id(), comment.id(), OWNER));
        service.deletePost(post.id(), OWNER);
        assertThrows(BusinessException.class, () -> service.comments(post.id(), 0, null));
        assertThrows(BusinessException.class, () -> service.createComment(post.id(), OTHER, UUID.randomUUID(), "댓글"));
    }

    @Test
    void deletesOnlyOwnedCommentAndKeepsCountCorrect() {
        EntryResult post = create();
        EntryResult comment = service.createComment(post.id(), OTHER, UUID.randomUUID(), "댓글");
        service.editComment(post.id(), comment.id(), OTHER, "수정 댓글");
        assertEquals("수정 댓글", service.comments(post.id(), 0, null).items().getFirst().body());
        service.deleteComment(post.id(), comment.id(), OTHER);
        assertEquals(0, service.post(post.id(), null).commentCount());
        assertTrue(service.comments(post.id(), 0, null).items().isEmpty());
        assertThrows(BusinessException.class, () -> service.deleteComment(post.id(), comment.id(), OTHER));
    }

    @Test
    void paginatesWithoutRepeatingEntries() {
        for (int index = 0; index < 21; index++) {
            create();
        }
        CommunityPage first = service.posts(Long.MAX_VALUE);
        CommunityPage next = service.posts(first.nextCursor());
        assertEquals(20, first.items().size());
        assertFalse(next.items().isEmpty());
        assertTrue(next.items().stream().allMatch(item -> item.id() < first.nextCursor()));
    }

    private EntryResult create() {
        return service.createPost(OWNER, UUID.randomUUID(), "제목", "본문");
    }
}
