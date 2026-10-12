package art.yesulin.auditionpost.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.auditionpost.application.AdminAuditionPostDetailResult.Attachment;
import art.yesulin.auditionpost.application.AuditionPostImportServiceTest.FakeSource;
import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostErrorCode;
import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.auditionpost.domain.AuditionPostFileKind;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.auditionpost.domain.AuditionPostStatus;
import art.yesulin.auditionpost.domain.upload.AuditionPostUploadRepository;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:audition-post-import;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, AuditionPostImportServiceTest.FakeSourceConfiguration.class})
class AuditionPostWriteServiceTest {

    private static final long ADMIN_ID = 1L;
    private static final String OTR_ID = "22397";
    private static final String PUBLIC_URL_PREFIX = "https://cdn.test/assets/";
    private static final Pattern IMAGE_SRC = Pattern.compile("<img src=\"([^\"]+)\"");

    @Autowired
    private AuditionPostWriteService writeService;

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
    private AuditionPostUploadService uploadService;

    @Autowired
    private AuditionPostUploadRepository uploadRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
        auditLogRepository.deleteAll();
        uploadRepository.deleteAll();
        source.reset();
    }

    @Test
    void editsTextAndKeepsBodyWhenBodyIsNotSent() {
        long id = importWithFiles();
        AdminAuditionPostDetailResult before = writeService.findForEdit(id);

        AdminAuditionPostResult edited = writeService.edit(ADMIN_ID, id, command(null, attachmentUrls(before)));

        assertNotNull(edited.editedAt());
        assertEquals("고친 제목", edited.title());
        assertEquals(2, edited.imageCount());
        assertEquals(2, edited.attachmentCount());
        AdminAuditionPostDetailResult after = writeService.findForEdit(id);
        assertEquals(before.bodyHtml(), after.bodyHtml());
        assertEquals("뮤지컬", after.category());
        assertEquals("회당 5만원", after.pay());
        assertEquals("상시", after.deadlineText());
        assertEquals(List.of("뮤지컬"), after.tags());
        assertEquals(AuditionPostStatus.HIDDEN, after.status());
        assertEquals(2, auditLogRepository.count());
    }

    @Test
    void editedBodyKeepsOnlyOwnImagesAndRemovedFilesAreDeleted() {
        long id = importWithFiles();
        AdminAuditionPostDetailResult before = writeService.findForEdit(id);
        List<String> imageUrls = imageUrls(before.bodyHtml());
        String body = "<p>새 본문</p><img src=\"" + imageUrls.get(1) + "\">"
                + "<img src=\"https://tracker.test/pixel.gif\"><script>alert(1)</script>";

        writeService.edit(ADMIN_ID, id, command(body, List.of(before.attachments().get(1).url())));

        AdminAuditionPostDetailResult after = writeService.findForEdit(id);
        assertEquals("<p>새 본문</p><img src=\"" + imageUrls.get(1) + "\">", after.bodyHtml());
        assertEquals(List.of("악보.pdf"), after.attachments().stream().map(Attachment::name).toList());
        assertFalse(storage.contains(objectKey(imageUrls.get(0))));
        assertTrue(storage.contains(objectKey(imageUrls.get(1))));
        assertFalse(storage.contains(objectKey(before.attachments().get(0).url())));
        assertTrue(storage.contains(objectKey(before.attachments().get(1).url())));

        auditionPostService.changeStatus(ADMIN_ID, id, AuditionPostStatus.PUBLISHED);
        PublicAuditionPostView view = auditionPostService.findPublicPost(id);
        assertEquals(after.bodyHtml(), ((PublicAuditionPostView.Published) view).post().bodyHtml());
    }

    @Test
    void rejectsAttachmentOfAnotherPostWithoutChanges() {
        long id = importWithFiles();
        final int objects = storage.objectCount();

        assertCode(
                AuditionPostErrorCode.INVALID_INPUT,
                () -> writeService.edit(ADMIN_ID, id, command(null, List.of(PUBLIC_URL_PREFIX + "other.pdf")))
        );
        assertNull(writeService.findForEdit(id).editedAt());
        assertEquals(objects, storage.objectCount());
    }

    @Test
    void reimportOfEditedPostNeedsConfirmation() {
        long id = importWithFiles();
        writeService.edit(ADMIN_ID, id, command(null, attachmentUrls(writeService.findForEdit(id))));
        final int objects = storage.objectCount();

        assertCode(AuditionPostErrorCode.EDITED, () -> importService.importPost(ADMIN_ID, OTR_ID));
        assertEquals(objects, storage.objectCount());
        assertEquals("고친 제목", writeService.findForEdit(id).title());

        AuditionPostImportResult reimported = importService.importPost(ADMIN_ID, OTR_ID, true);

        assertEquals(id, reimported.post().id());
        assertEquals("배우 모집", reimported.post().title());
        assertNull(reimported.post().editedAt());
    }

    @Test
    void editWaitsForEditInProgressAndRejectsAttachmentItRemoved() throws Exception {
        long id = importWithFiles();
        List<String> staleAttachments = attachmentUrls(writeService.findForEdit(id));
        CountDownLatch locked = new CountDownLatch(1);
        CountDownLatch released = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        final Future<?> first = executor.submit(() -> removeFirstAttachmentHolding(id, locked, released));
        assertTrue(locked.await(5, TimeUnit.SECONDS));

        Future<?> second = executor.submit(() -> writeService.edit(ADMIN_ID, id, command(null, staleAttachments)));

        assertThrows(TimeoutException.class, () -> second.get(500, TimeUnit.MILLISECONDS));
        released.countDown();
        first.get(5, TimeUnit.SECONDS);
        ExecutionException exception = assertThrows(ExecutionException.class, () -> second.get(5, TimeUnit.SECONDS));
        executor.shutdown();

        BusinessException cause = assertInstanceOf(BusinessException.class, exception.getCause());
        assertEquals(AuditionPostErrorCode.INVALID_INPUT, cause.getErrorCode());
        assertEquals(List.of("악보.pdf"), attachmentNames(id));
    }

    @Test
    void reimportWaitsForEditInProgressAndDoesNotOverwriteIt() throws Exception {
        long id = importWithFiles();
        final int objects = storage.objectCount();
        CountDownLatch locked = new CountDownLatch(1);
        CountDownLatch released = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        final Future<?> edit = executor.submit(() -> removeFirstAttachmentHolding(id, locked, released));
        assertTrue(locked.await(5, TimeUnit.SECONDS));

        Future<?> reimport = executor.submit(() -> importService.importPost(ADMIN_ID, OTR_ID));

        assertThrows(TimeoutException.class, () -> reimport.get(500, TimeUnit.MILLISECONDS));
        released.countDown();
        edit.get(5, TimeUnit.SECONDS);
        ExecutionException exception = assertThrows(ExecutionException.class, () -> reimport.get(5, TimeUnit.SECONDS));
        executor.shutdown();

        BusinessException cause = assertInstanceOf(BusinessException.class, exception.getCause());
        assertEquals(AuditionPostErrorCode.EDITED, cause.getErrorCode());
        assertEquals(List.of("악보.pdf"), attachmentNames(id));
        assertEquals(objects, storage.objectCount());
    }

    @Test
    void writesHiddenPostWithUploadedImageAndAttachment() {
        String imageUrl = upload(ADMIN_ID, AuditionPostFileKind.IMAGE, "포스터.png", "image/png");
        String attachmentUrl = upload(ADMIN_ID, AuditionPostFileKind.ATTACHMENT, "지원서.hwp", "");
        String body = "<p>직접 쓴 공고</p><p><img src=\"" + imageUrl + "\"></p><img src=\"https://tracker.test/x.gif\">";

        AdminAuditionPostResult written = writeService.write(ADMIN_ID, command(body, List.of(attachmentUrl)));

        assertEquals(AuditionPostStatus.HIDDEN, written.status());
        assertEquals("YESULIN", written.source());
        assertNull(written.externalId());
        assertNull(written.sourceUrl());
        assertFalse(written.autoImported());
        assertEquals(1, written.imageCount());
        assertEquals(1, written.attachmentCount());
        AdminAuditionPostDetailResult detail = writeService.findForEdit(written.id());
        assertEquals("<p>직접 쓴 공고</p><p><img src=\"" + imageUrl + "\"></p>", detail.bodyHtml());
        assertEquals("application/x-hwp", detail.attachments().getFirst().contentType());
        assertEquals(
                AuditionPostFileRules.attachmentDisposition("지원서.hwp"),
                storage.contentDisposition(objectKey(attachmentUrl))
        );
        assertEquals(0, uploadRepository.count());
        assertCode(AuditionPostErrorCode.NOT_FOUND, () -> auditionPostService.findPublicPost(written.id()));

        auditionPostService.changeStatus(ADMIN_ID, written.id(), AuditionPostStatus.PUBLISHED);
        PublicAuditionPostResult published = ((PublicAuditionPostView.Published) auditionPostService
                .findPublicPost(written.id())).post();
        assertEquals(detail.bodyHtml(), published.bodyHtml());
        assertNull(published.sourceUrl());
    }

    @Test
    void ignoresUploadsOfAnotherAdmin() {
        String imageUrl = upload(2L, AuditionPostFileKind.IMAGE, "a.png", "image/png");
        String attachmentUrl = upload(2L, AuditionPostFileKind.ATTACHMENT, "a.pdf", "");

        AdminAuditionPostResult written = writeService.write(
                ADMIN_ID, command("<img src=\"" + imageUrl + "\">", List.of())
        );
        assertEquals(0, written.imageCount());
        assertCode(
                AuditionPostErrorCode.INVALID_INPUT,
                () -> writeService.write(ADMIN_ID, command("<p>본문</p>", List.of(attachmentUrl)))
        );
        assertEquals(2, uploadRepository.count());
    }

    @Test
    void rejectsUploadThatHasNotArrived() {
        String attachmentUrl = uploadService.prepare(ADMIN_ID, AuditionPostFileKind.ATTACHMENT, "a.pdf", "", 10)
                .publicUrl();

        assertCode(
                AuditionPostErrorCode.FILE_REJECTED,
                () -> writeService.write(ADMIN_ID, command("<p>본문</p>", List.of(attachmentUrl)))
        );
        assertEquals(1, uploadRepository.count());
        assertEquals(0, repository.count());
    }

    @Test
    void editAddsUploadedAttachmentToImportedPost() {
        long id = importWithFiles();
        List<String> attachments = new ArrayList<>(attachmentUrls(writeService.findForEdit(id)));
        attachments.add(upload(ADMIN_ID, AuditionPostFileKind.ATTACHMENT, "대본.pdf", ""));

        AdminAuditionPostResult edited = writeService.edit(ADMIN_ID, id, command(null, attachments));

        assertEquals(3, edited.attachmentCount());
        assertEquals("대본.pdf", writeService.findForEdit(id).attachments().get(2).name());
    }

    @Test
    void missingPostIsNotFound() {
        assertCode(AuditionPostErrorCode.NOT_FOUND, () -> writeService.findForEdit(999L));
        assertCode(AuditionPostErrorCode.NOT_FOUND, () -> writeService.edit(ADMIN_ID, 999L, command(null, List.of())));
    }

    private long importWithFiles() {
        source.file("img-0", "image/png", 100);
        source.file("img-1", "image/png", 100);
        source.file("doc", "application/octet-stream", 100);
        source.file("score", "application/octet-stream", 100);
        source.post(
                "<p>안내</p><img src=\"post-file:0\"><img src=\"post-file:1\">",
                List.of(new SourceFile("poster.png", "img-0"), new SourceFile("detail.png", "img-1")),
                List.of(new SourceFile("지원서.hwp", "doc"), new SourceFile("악보.pdf", "score"))
        );
        return importService.importPost(ADMIN_ID, OTR_ID).post().id();
    }

    /** 다른 운영자가 공고를 잠근 채 첫 첨부를 빼는 중인 상태를 만든다. {@code released}가 열리면 커밋한다. */
    private void removeFirstAttachmentHolding(long postId, CountDownLatch locked, CountDownLatch released) {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            AuditionPost post = repository.findByIdForUpdate(postId).orElseThrow();
            List<AuditionPostFile> files = new ArrayList<>(post.getFiles());
            files.remove(post.attachments().getFirst());
            post.edit(post.getContent(), List.copyOf(post.getTags()), files, ADMIN_ID, Instant.now());
            locked.countDown();
            awaitQuietly(released);
        });
    }

    private static void awaitQuietly(CountDownLatch latch) {
        try {
            assertTrue(latch.await(5, TimeUnit.SECONDS));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    private List<String> attachmentNames(long postId) {
        return writeService.findForEdit(postId).attachments().stream().map(Attachment::name).toList();
    }

    private static AuditionPostWriteCommand command(String bodyHtml, List<String> attachmentUrls) {
        return new AuditionPostWriteCommand(
                "뮤지컬", "고친 제목", "회당 5만원", "상시", "예술극단", bodyHtml, List.of("뮤지컬"), attachmentUrls
        );
    }

    /** 올릴 주소를 받고 브라우저처럼 그 주소로 올린 뒤 공개 주소를 돌려준다. */
    private String upload(long uploaderId, AuditionPostFileKind kind, String filename, String reportedType) {
        AuditionPostUploadResult prepared = uploadService.prepare(uploaderId, kind, filename, reportedType, 100);
        storage.upload(prepared.url(), prepared.headers().get("Content-Type"), 100);
        return prepared.publicUrl();
    }

    private static List<String> attachmentUrls(AdminAuditionPostDetailResult post) {
        return post.attachments().stream().map(Attachment::url).toList();
    }

    private static List<String> imageUrls(String bodyHtml) {
        List<String> urls = new ArrayList<>();
        Matcher matcher = IMAGE_SRC.matcher(bodyHtml);
        while (matcher.find()) {
            urls.add(matcher.group(1));
        }
        return urls;
    }

    private static String objectKey(String publicUrl) {
        return "public/" + publicUrl.substring(PUBLIC_URL_PREFIX.length());
    }

    private void assertCode(AuditionPostErrorCode expected, Executable executable) {
        BusinessException exception = assertThrows(BusinessException.class, executable);
        assertEquals(expected, exception.getErrorCode());
    }
}
