package art.yesulin.actor.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import art.yesulin.actor.application.bookmark.ProducerActorBookmarkService;
import art.yesulin.actor.application.profileimport.ProfileImportService;
import art.yesulin.actor.domain.bookmark.ProducerActorBookmark;
import art.yesulin.actor.domain.bookmark.ProducerActorBookmarkErrorCode;
import art.yesulin.actor.domain.bookmark.ProducerActorBookmarkRepository;
import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageHandle;
import art.yesulin.actor.domain.page.ActorPageReadiness;
import art.yesulin.actor.domain.page.ActorPageRepository;
import art.yesulin.actor.domain.profileimport.ProfileImportErrorCode;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.global.exception.ErrorCode;
import art.yesulin.infrastructure.storage.S3PrivateObjects;
import art.yesulin.pdfextraction.application.FakePdfExtractionStorage;
import art.yesulin.pdfextraction.application.PdfExtractionStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.LongStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:actor-request-concurrency;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate",
        "yesulin.pdf-extraction.enabled=true"
})
@Import(ObjectStorageTestConfiguration.class)
class ActorRequestConcurrencyTest {

    @Autowired
    private MemberRepository members;
    @Autowired
    private ActorPageRepository pages;
    @Autowired
    private ProducerActorBookmarkRepository bookmarks;
    @Autowired
    private ProducerActorBookmarkService bookmarkService;
    @Autowired
    private ProfileImportService imports;
    @Autowired
    private PlatformTransactionManager transactionManager;
    @MockitoBean
    private PdfExtractionStorage storage;
    @MockitoBean
    private S3PrivateObjects pdfPrivateObjects;

    @BeforeEach
    void prepareStorage() {
        FakePdfExtractionStorage fake = new FakePdfExtractionStorage();
        when(storage.prepare(any())).thenAnswer(invocation -> fake.prepare(invocation.getArgument(0)));
    }

    @Test
    void concurrentFirstImportsCreateOnlyOneJob() throws Exception {
        long owner = members.saveAndFlush(Member.ofApplicant()).getId();

        assertSerialized(() -> imports.prepare(owner, "first.pdf", 100),
                () -> imports.prepare(owner, "second.pdf", 100), ProfileImportErrorCode.PROFILE_IMPORT_IN_PROGRESS);

        assertEquals("first.pdf", imports.findCurrent(owner).current().originalFilename());
    }

    @Test
    void concurrentDifferentBookmarksCannotExceedTheLimit() throws Exception {
        long producer = producer();
        List<ActorPage> actors = pages.saveAllAndFlush(LongStream.range(1, 302)
                .mapToObj(owner -> publicPage(producer * 1_000 + owner)).toList());
        bookmarks.saveAllAndFlush(actors.subList(0, 299).stream()
                .map(page -> new ProducerActorBookmark(producer, page.getId(), Instant.now())).toList());

        assertSerialized(() -> bookmarkService.save(producer, actors.get(299).getPublicId()),
                () -> bookmarkService.save(producer, actors.get(300).getPublicId()),
                ProducerActorBookmarkErrorCode.ACTOR_BOOKMARK_LIMIT_EXCEEDED);

        assertEquals(300, bookmarks.countByProducerMemberId(producer));
    }

    @Test
    void concurrentSameBookmarkRemainsIdempotent() throws Exception {
        long producer = producer();
        ActorPage actor = pages.saveAndFlush(publicPage(producer * 1_000));

        assertSerialized(() -> bookmarkService.save(producer, actor.getPublicId()),
                () -> bookmarkService.save(producer, actor.getPublicId()), null);

        assertEquals(1, bookmarks.countByProducerMemberId(producer));
    }

    private long producer() {
        return members.saveAndFlush(new Member(null, null, MemberType.PRODUCER, MemberStatus.ACTIVE)).getId();
    }

    private ActorPage publicPage(long owner) {
        ActorPage page = new ActorPage(owner);
        page.changeHandle(new ActorPageHandle("actor_" + owner));
        page.publish(true, ActorPage.CONSENT_VERSION, new ActorPageReadiness(true, List.of(), false, false),
                Instant.now());
        return page;
    }

    /** 첫 요청의 커밋을 보류해 두 번째 요청이 이전 집계로 한도를 통과하지 못하는지 확인한다. */
    private void assertSerialized(Runnable first, Runnable second, ErrorCode expected) throws Exception {
        CountDownLatch changed = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> firstRequest = executor.submit(() -> transaction.executeWithoutResult(status -> {
                first.run();
                changed.countDown();
                await(release);
            }));
            try {
                assertTrue(changed.await(10, TimeUnit.SECONDS));
                Future<ErrorCode> secondRequest = executor.submit(() -> {
                    secondStarted.countDown();
                    try {
                        second.run();
                        return null;
                    } catch (BusinessException exception) {
                        return exception.getErrorCode();
                    }
                });
                assertTrue(secondStarted.await(10, TimeUnit.SECONDS));
                assertThrows(TimeoutException.class, () -> secondRequest.get(200, TimeUnit.MILLISECONDS));
                release.countDown();
                firstRequest.get(10, TimeUnit.SECONDS);
                assertEquals(expected, secondRequest.get(10, TimeUnit.SECONDS));
            } finally {
                release.countDown();
            }
        }
    }

    private void await(CountDownLatch latch) {
        try {
            if (!latch.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("동시성 검증 대기 시간이 초과되었습니다.");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }
}
