package art.yesulin.auditionpost.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.auditionpost.application.AdminAuditionPostDetailResult.Attachment;
import art.yesulin.auditionpost.application.AuditionPostImportServiceTest.FakeSource;
import art.yesulin.auditionpost.domain.AuditionPostErrorCode;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.auditionpost.domain.AuditionPostStatus;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

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

    @BeforeEach
    void setUp() {
        repository.deleteAll();
        auditLogRepository.deleteAll();
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

    private static AuditionPostEditCommand command(String bodyHtml, List<String> attachmentUrls) {
        return new AuditionPostEditCommand(
                "뮤지컬", "고친 제목", "회당 5만원", "상시", "예술극단", bodyHtml, List.of("뮤지컬"), attachmentUrls
        );
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
