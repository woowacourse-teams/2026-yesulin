package art.yesulin.auditionpost.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.auditionpost.application.AuditionPostImportResult.SkippedFile;
import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostCreation;
import art.yesulin.auditionpost.domain.AuditionPostErrorCode;
import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.auditionpost.domain.AuditionPostStatus;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.global.exception.ErrorCode;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:audition-post-import;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, AuditionPostImportServiceTest.FakeSourceConfiguration.class})
class AuditionPostImportServiceTest {

    private static final long ADMIN_ID = 1L;
    private static final String OTR_ID = "22397";

    @Autowired
    private AuditionPostImportService importService;

    @Autowired
    private AuditionPostService auditionPostService;

    @Autowired
    private AuditionPostRepository repository;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @Autowired
    private FakeObjectStorage storage;

    @Autowired
    private FakeSource source;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
        auditLogRepository.deleteAll();
        source.reset();
    }

    @Test
    void importsBodyImagesAndAttachmentsAsPendingUntilPublished() {
        source.file("img-0", "image/png", 100);
        source.file("img-1", "application/octet-stream", 100);
        source.file("doc", "application/octet-stream", 100);
        source.file("huge", "application/octet-stream", AuditionPostFileRules.MAX_ATTACHMENT_BYTES + 1);
        source.post(
                "<p>안내</p><img src=\"post-file:0\"><img src=\"post-file:1\">",
                List.of(new SourceFile("poster.png", "img-0"), new SourceFile("detail.jpg", "img-1")),
                List.of(
                        new SourceFile("지원서.hwp", "doc"),
                        new SourceFile("setup.exe", "exe"),
                        new SourceFile("음원.mp3", "huge")
                )
        );
        final int before = storage.objectCount();

        AuditionPostImportResult result = importService.importPost(ADMIN_ID, OTR_ID);

        assertTrue(result.created());
        assertEquals(2, result.post().imageCount());
        assertEquals(1, result.post().attachmentCount());
        assertEquals(AuditionPostStatus.PENDING, result.post().status());
        assertEquals(
                List.of(new SkippedFile("setup.exe", "지원하지 않는 형식"), new SkippedFile("음원.mp3", "50MB 초과")),
                result.skippedAttachments()
        );
        assertEquals(before + 3, storage.objectCount());
        assertEquals(1, auditLogRepository.count());
        assertTrue(auditionPostService.findPublishedPage(0, 12, false, null).posts().isEmpty());

        auditionPostService.changeStatus(ADMIN_ID, result.post().id(), AuditionPostStatus.PUBLISHED);

        PublicAuditionPostResult detail = publishedDetail(result.post().id());
        assertFalse(detail.bodyHtml().contains("post-file:"));
        assertTrue(detail.bodyHtml().contains("https://cdn.test/assets/audition-posts/"));
        assertEquals("지원서.hwp", detail.attachments().getFirst().name());
        assertEquals("application/x-hwp", detail.attachments().getFirst().contentType());
        assertTrue(detail.attachments().getFirst().url().startsWith("https://cdn.test/assets/audition-posts/"));
        assertEquals(List.of("연극"), detail.tags());
        assertEquals("OTR", detail.source());
        assertEquals("https://otr.co.kr/audition/?vid=" + OTR_ID, detail.sourceUrl());
        assertFalse(detail.closed());

        PublicAuditionPostPageResult page = auditionPostService.findPublishedPage(0, 12, false, null);
        assertEquals(1, page.posts().size());
        assertTrue(page.posts().getFirst().thumbnailUrl().startsWith("https://cdn.test/assets/audition-posts/"));
    }

    @Test
    void reimportReplacesContentKeepsIdAndDeletesOldFiles() {
        source.file("img-0", "image/png", 100);
        source.post("<img src=\"post-file:0\">", List.of(new SourceFile("a.png", "img-0")), List.of());
        AuditionPostImportResult first = importAndPublish(OTR_ID);
        final String oldKey = imageKeys(first).getFirst();

        source.post("<p>수정된 본문</p>", List.of(), List.of());
        AuditionPostImportResult second = importService.importPost(ADMIN_ID, OTR_ID);

        assertFalse(second.created());
        assertEquals(first.post().id(), second.post().id());
        assertEquals(0, second.post().imageCount());
        assertFalse(storage.contains(oldKey));
        assertEquals(1, repository.count());
        assertEquals(AuditionPostStatus.PUBLISHED, second.post().status());
        assertEquals("<p>수정된 본문</p>", publishedDetail(first.post().id()).bodyHtml());
    }

    @Test
    void unsupportedImageStopsImportAndRemovesUploadedFiles() {
        source.file("img-0", "image/png", 100);
        source.file("img-1", "image/bmp", 100);
        source.post(
                "<img src=\"post-file:0\"><img src=\"post-file:1\">",
                List.of(new SourceFile("a.png", "img-0"), new SourceFile("b.bmp", "img-1")),
                List.of()
        );
        final int before = storage.objectCount();

        assertCode(AuditionPostErrorCode.FILE_REJECTED, () -> importService.importPost(ADMIN_ID, OTR_ID));
        assertEquals(before, storage.objectCount());
        assertEquals(0, repository.count());
    }

    @Test
    void rejectsUnsupportedCategoryBeforeStoringFiles() {
        source.file("img-0", "image/png", 100);
        source.post(
                "댄스", "2099-12-31", "<img src=\"post-file:0\">", List.of(new SourceFile("a.png", "img-0")), List.of()
        );
        final int before = storage.objectCount();

        assertCode(AuditionPostErrorCode.CATEGORY_NOT_SUPPORTED, () -> importService.importPost(ADMIN_ID, OTR_ID));
        assertEquals(before, storage.objectCount());
        assertEquals(0, repository.count());
    }

    @Test
    void listsOpenPostsByDefaultAndCountsBoth() {
        source.post("뮤지컬", "2000-01-01", "<p>마감</p>", List.of(), List.of());
        importAndPublish("1");
        source.post("연극", "상시", "<p>상시</p>", List.of(), List.of());
        importAndPublish("2");
        importService.importPost(ADMIN_ID, "3");

        PublicAuditionPostPageResult open = auditionPostService.findPublishedPage(0, 12, false, null);

        assertEquals(1, open.posts().size());
        assertEquals("상시", open.posts().getFirst().deadlineText());
        assertEquals(1, open.openCount());
        assertEquals(2, open.allCount());

        PublicAuditionPostPageResult all = auditionPostService.findPublishedPage(0, 1, true, null);
        assertEquals(2, all.totalElements());
        assertEquals(2, all.totalPages());
    }

    @Test
    void preservesCountsOnPartialAndOutOfRangePages() {
        source.post("뮤지컬", "상시", "<p>모집 중</p>", List.of(), List.of());
        importAndPublish("1");
        importAndPublish("2");
        source.post("뮤지컬", "2000-01-01", "<p>마감</p>", List.of(), List.of());
        importAndPublish("3");

        PublicAuditionPostPageResult last = auditionPostService.findPublishedPage(1, 2, true, "뮤지컬");
        assertEquals(1, last.posts().size());
        assertEquals(3, last.totalElements());
        assertEquals(2, last.totalPages());
        assertEquals(2, last.openCount());
        assertEquals(3, last.allCount());

        PublicAuditionPostPageResult outside = auditionPostService.findPublishedPage(2, 2, true, "뮤지컬");
        assertTrue(outside.posts().isEmpty());
        assertEquals(3, outside.totalElements());
        assertEquals(2, outside.totalPages());

        PublicAuditionPostPageResult open = auditionPostService.findPublishedPage(1, 2, false, "뮤지컬");
        assertTrue(open.posts().isEmpty());
        assertEquals(2, open.totalElements());
        assertEquals(1, open.totalPages());
        assertEquals(3, open.allCount());
    }

    @Test
    void returnsZeroCountsForEmptyResults() {
        PublicAuditionPostPageResult empty = auditionPostService.findPublishedPage(0, 12, false, null);
        assertTrue(empty.posts().isEmpty());
        assertEquals(0, empty.totalElements());
        assertEquals(0, empty.totalPages());
        assertEquals(0, empty.openCount());
        assertEquals(0, empty.allCount());

        source.post("뮤지컬", "상시", "<p>모집 중</p>", List.of(), List.of());
        importAndPublish("1");
        PublicAuditionPostPageResult category = auditionPostService.findPublishedPage(0, 12, true, "연극");
        assertTrue(category.posts().isEmpty());
        assertEquals(0, category.totalElements());
        assertEquals(0, category.totalPages());
        assertEquals(0, category.openCount());
        assertEquals(0, category.allCount());
    }

    @Test
    void filtersCategoryBeforePaginationAndCountsOnlyThatCategory() {
        source.post("뮤지컬", "2000-01-01", "<p>마감</p>", List.of(), List.of());
        importAndPublish("1");
        source.post("뮤지컬", "상시", "<p>모집 중</p>", List.of(), List.of());
        final long openId = importAndPublish("2").post().id();
        importService.importPost(ADMIN_ID, "3");
        long hiddenId = importAndPublish("4").post().id();
        auditionPostService.changeStatus(ADMIN_ID, hiddenId, AuditionPostStatus.HIDDEN);
        source.post("연극", "상시", "<p>다른 분야</p>", List.of(), List.of());
        importAndPublish("5");

        PublicAuditionPostPageResult open = auditionPostService.findPublishedPage(0, 1, false, "뮤지컬");

        assertEquals(List.of(openId), open.posts().stream().map(PublicAuditionPostSummaryResult::id).toList());
        assertEquals(1, open.totalElements());
        assertEquals(1, open.openCount());
        assertEquals(2, open.allCount());
        PublicAuditionPostPageResult second = auditionPostService.findPublishedPage(1, 1, true, "뮤지컬");
        assertEquals(2, second.totalPages());
        assertEquals("뮤지컬", second.posts().getFirst().category());
        assertTrue(second.posts().getFirst().closed());
        assertEquals(1, auditionPostService.findPublishedPage(0, 12, true, "연극").allCount());
    }

    @Test
    void rejectsUnsupportedPublicCategory() {
        assertThrows(IllegalArgumentException.class, () -> auditionPostService.findPublishedPage(0, 12, true, "영화"));
    }

    @Test
    void autoImportCreatesPendingPostWithoutAuditLog() {
        Optional<Long> postId = importService.importIfAbsent("OTR", OTR_ID);

        AdminAuditionPostResult post = auditionPostService.findAllForAdmin(null).getFirst();
        assertEquals(Optional.of(post.id()), postId);
        assertEquals(AuditionPostCreation.AUTO_IMPORT, post.createdVia());
        assertEquals(AuditionPostStatus.PENDING, post.status());
        assertEquals(0, auditLogRepository.count());
    }

    @Test
    void autoImportKeepsPostAlreadyHandledByOperator() {
        AuditionPostImportResult imported = importAndPublish(OTR_ID);
        source.post("<p>원문이 바뀜</p>", List.of(), List.of());

        assertEquals(Optional.of(imported.post().id()), importService.importIfAbsent("OTR", OTR_ID));

        AdminAuditionPostResult post = auditionPostService.findAllForAdmin(null).getFirst();
        assertEquals(AuditionPostStatus.PUBLISHED, post.status());
        assertEquals(AuditionPostCreation.ADMIN_IMPORT, post.createdVia());
        assertEquals("<p>본문</p>", publishedDetail(post.id()).bodyHtml());
        assertEquals(1, repository.count());
    }

    @Test
    void autoImportKeepsPostImportedByOperatorWhileFetching() {
        source.file("img-0", "image/png", 100);
        source.beforeFetch(() -> {
            importService.importPost(ADMIN_ID, OTR_ID);
            source.post("<p>원문이 바뀜</p>", List.of(new SourceFile("a.png", "img-0")), List.of());
        });
        final int before = storage.objectCount();

        Optional<Long> id = importService.importIfAbsent("OTR", OTR_ID);

        AdminAuditionPostResult post = auditionPostService.findAllForAdmin(null).getFirst();
        assertEquals(Optional.of(post.id()), id);
        assertEquals(1, repository.count());
        assertEquals(AuditionPostCreation.ADMIN_IMPORT, post.createdVia());
        assertEquals(AuditionPostStatus.PENDING, post.status());
        assertEquals(before, storage.objectCount());
        assertEquals(1, auditLogRepository.count());
        auditionPostService.changeStatus(ADMIN_ID, id.orElseThrow(), AuditionPostStatus.PUBLISHED);
        assertEquals("<p>본문</p>", publishedDetail(id.orElseThrow()).bodyHtml());
    }

    @Test
    void ignoresOtherSourceOnAutoImport() {
        assertTrue(importService.importIfAbsent("PLAYDB", OTR_ID).isEmpty());
        assertEquals(0, repository.count());
    }

    @Test
    void sourceFailureBecomesBusinessError() {
        source.failFetch();

        assertCode(AuditionPostErrorCode.SOURCE_UNAVAILABLE, () -> importService.importPost(ADMIN_ID, OTR_ID));
    }

    @Test
    void hiddenPostLeavesPublicListAndDetailPointsToOriginal() {
        AuditionPostImportResult result = importAndPublish(OTR_ID);

        auditionPostService.changeStatus(ADMIN_ID, result.post().id(), AuditionPostStatus.HIDDEN);

        assertTrue(auditionPostService.findPublishedPage(0, 12, false, null).posts().isEmpty());
        PublicAuditionPostView view = auditionPostService.findPublicPost(result.post().id());
        assertEquals(
                URI.create("https://otr.co.kr/audition/?vid=" + OTR_ID),
                assertInstanceOf(PublicAuditionPostView.Hidden.class, view).originalUrl()
        );
        assertEquals(AuditionPostStatus.HIDDEN, auditionPostService.findAllForAdmin(null).getFirst().status());
        assertEquals(3, auditLogRepository.count());
    }

    @Test
    void missingPostIsNotFound() {
        assertCode(AuditionPostErrorCode.NOT_FOUND, () -> auditionPostService.findPublicPost(999L));
        assertCode(AuditionPostErrorCode.NOT_FOUND, () -> auditionPostService.increaseRedirectCount(999L));
    }

    @Test
    void countsRedirectsOfUnpublishedPostsSeparatelyFromViewsAndKeepsThemOnReimport() {
        AuditionPostImportResult imported = importService.importPost(ADMIN_ID, OTR_ID);
        long postId = imported.post().id();

        auditionPostService.increaseRedirectCount(postId);
        auditionPostService.increaseRedirectCount(postId);
        importService.importPost(ADMIN_ID, OTR_ID);
        assertCode(AuditionPostErrorCode.NOT_FOUND, () -> auditionPostService.increaseViewCount(postId));

        auditionPostService.changeStatus(ADMIN_ID, postId, AuditionPostStatus.PUBLISHED);
        assertCode(AuditionPostErrorCode.NOT_FOUND, () -> auditionPostService.increaseRedirectCount(postId));
        auditionPostService.changeStatus(ADMIN_ID, postId, AuditionPostStatus.HIDDEN);
        auditionPostService.increaseRedirectCount(postId);

        AdminAuditionPostResult post = auditionPostService.findAllForAdmin(null).getFirst();
        assertEquals(3, post.redirectCount());
        assertEquals(0, post.viewCount());
    }

    @Test
    void statusChangeKeepsRedirectCountedAfterLoading() {
        long id = importService.importPost(ADMIN_ID, OTR_ID).post().id();

        new TransactionTemplate(transactionManager).executeWithoutResult(outer -> {
            AuditionPost post = repository.findById(id).orElseThrow();
            TransactionTemplate inner = new TransactionTemplate(transactionManager);
            inner.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            inner.executeWithoutResult(ignored -> auditionPostService.increaseRedirectCount(id));
            post.changeStatus(AuditionPostStatus.PUBLISHED);
        });

        AdminAuditionPostResult post = auditionPostService.findAllForAdmin(null).getFirst();
        assertEquals(1, post.redirectCount());
        assertEquals(AuditionPostStatus.PUBLISHED, post.status());
    }

    @Test
    void countsViewsOfPublishedPostsAndKeepsThemOnReimport() {
        AuditionPostImportResult imported = importAndPublish(OTR_ID);
        long postId = imported.post().id();

        auditionPostService.increaseViewCount(postId);
        auditionPostService.increaseViewCount(postId);
        importService.importPost(ADMIN_ID, OTR_ID);

        assertEquals(2, publishedDetail(postId).viewCount());
        auditionPostService.changeStatus(ADMIN_ID, postId, AuditionPostStatus.HIDDEN);
        assertCode(AuditionPostErrorCode.NOT_FOUND, () -> auditionPostService.increaseViewCount(postId));
    }

    @Test
    void rejectsOutOfRangePageSize() {
        assertThrows(IllegalArgumentException.class, () -> auditionPostService.findPublishedPage(0, 49, false, null));
        assertThrows(IllegalArgumentException.class, () -> auditionPostService.findPublishedPage(-1, 10, false, null));
    }

    private AuditionPostImportResult importAndPublish(String otrId) {
        AuditionPostImportResult imported = importService.importPost(ADMIN_ID, otrId);
        auditionPostService.changeStatus(ADMIN_ID, imported.post().id(), AuditionPostStatus.PUBLISHED);
        return imported;
    }

    private PublicAuditionPostResult publishedDetail(long postId) {
        PublicAuditionPostView view = auditionPostService.findPublicPost(postId);
        return assertInstanceOf(PublicAuditionPostView.Published.class, view).post();
    }

    private List<String> imageKeys(AuditionPostImportResult result) {
        return new TransactionTemplate(transactionManager).execute(status -> {
            AuditionPost post = repository.findById(result.post().id()).orElseThrow();
            return post.images().stream().map(AuditionPostFile::getObjectKey).toList();
        });
    }

    private void assertCode(ErrorCode expected, Executable executable) {
        BusinessException exception = assertThrows(BusinessException.class, executable);
        assertInstanceOf(AuditionPostErrorCode.class, exception.getErrorCode());
        assertEquals(expected, exception.getErrorCode());
    }

    @TestConfiguration
    static class FakeSourceConfiguration {

        @Bean
        @Primary
        FakeSource fakeAuditionPostSource() {
            return new FakeSource();
        }
    }

    static class FakeSource implements AuditionPostSource {

        private final Map<String, FakeFile> files = new HashMap<>();
        /** 원문 번호별 작성자 회원 번호. 없으면 작성자 번호가 없는 공고다. */
        private final Map<String, String> authorIds = new HashMap<>();
        /** 작성자 번호만 읽을 때 실패하는 원문 번호. */
        private final Set<String> missingPages = new HashSet<>();
        private String authorName;
        private String category;
        private String deadline;
        private String bodyHtml;
        private List<SourceFile> images;
        private List<SourceFile> attachments;
        private boolean failFetch;
        private Runnable beforeFetch;

        void reset() {
            files.clear();
            authorIds.clear();
            missingPages.clear();
            authorName = "예술극단";
            post("<p>본문</p>", List.of(), List.of());
            failFetch = false;
            beforeFetch = null;
        }

        void file(String url, String contentType, long size) {
            files.put(url, new FakeFile(contentType, size));
        }

        void post(String bodyHtml, List<SourceFile> images, List<SourceFile> attachments) {
            post("연극", "2099-12-31", bodyHtml, images, attachments);
        }

        void post(
                String category,
                String deadline,
                String bodyHtml,
                List<SourceFile> images,
                List<SourceFile> attachments
        ) {
            this.category = category;
            this.deadline = deadline;
            this.bodyHtml = bodyHtml;
            this.images = images;
            this.attachments = attachments;
        }

        void failFetch() {
            failFetch = true;
        }

        void author(String externalId, String authorId, String name) {
            authorIds.put(externalId, authorId);
            authorName = name;
        }

        void pageGone(String externalId) {
            missingPages.add(externalId);
        }

        void beforeFetch(Runnable hook) {
            beforeFetch = hook;
        }

        @Override
        public String getSource() {
            return "OTR";
        }

        @Override
        public SourcePost fetch(String externalId) {
            if (failFetch) {
                throw new AuditionPostSourceException("OTR에 연결하지 못했습니다.");
            }
            if (beforeFetch != null) {
                Runnable hook = beforeFetch;
                beforeFetch = null;
                hook.run();
            }
            return new SourcePost(
                    externalId, "https://otr.co.kr/audition/?vid=" + externalId, category, "배우 모집", "협의",
                    deadline, authorName, authorIds.get(externalId), LocalDateTime.of(2026, 10, 4, 10, 16), bodyHtml,
                    List.of("연극"), images, attachments
            );
        }

        @Override
        public Optional<String> fetchAuthorId(String externalId) {
            if (missingPages.contains(externalId)) {
                throw new AuditionPostSourceException("OTR 공고 상세를 찾을 수 없습니다.");
            }
            return Optional.ofNullable(authorIds.get(externalId));
        }

        @Override
        public SourceFileContent open(SourceFile file, long maxBytes) {
            FakeFile fake = files.get(file.url());
            if (fake == null) {
                throw new AuditionPostSourceException("파일을 받지 못했습니다.");
            }
            if (fake.size() > maxBytes) {
                throw new SourceFileTooLargeException("너무 큽니다.");
            }
            byte[] bytes = new byte[Math.toIntExact(fake.size())];
            return new SourceFileContent(fake.contentType(), bytes.length, new ByteArrayInputStream(bytes));
        }

        private record FakeFile(String contentType, long size) {
        }
    }
}
